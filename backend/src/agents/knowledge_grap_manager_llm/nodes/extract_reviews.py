"""
extract_reviews — LLM NODE

Parses review CSV data stored in state (fetched from DB) and synthesizes per-product sentiment.
Supports dedicated review datasets as well as product catalog/inventory CSVs with embedded review columns.
"""

import json
import csv
import io
from collections import defaultdict

from ..state import WikiState, ExtractedReview, ReviewSynthesis
from ..utils.llm import call_llm_json
from ..utils.file_io import slugify


def _parse_csv_data(csv_data: str | list) -> list[dict]:
    """Parse CSV text string into a list of row dictionaries."""
    if isinstance(csv_data, list):
        return csv_data
    if not csv_data or not str(csv_data).strip():
        return []

    try:
        reader = csv.DictReader(io.StringIO(csv_data))
        return [dict(row) for row in reader]
    except Exception as e:
        print(f"  Error parsing CSV string: {e}")
        return []


def _parse_review_rows(rows: list[dict], source_name: str = "db_review") -> list[ExtractedReview]:
    """Parse CSV rows into ExtractedReview objects."""
    reviews = []

    # Normalize column names mapping
    col_map = {}
    if rows:
        sample = rows[0]
        for key in sample.keys():
            key_lower = key.lower().strip()
            if "product" in key_lower and "name" in key_lower:
                col_map["product_name"] = key
            elif "product" in key_lower and "slug" not in key_lower:
                col_map["product_name"] = key
            elif "name" in key_lower and "product" not in col_map:
                col_map["product_name"] = key
            elif "rating" in key_lower or "star" in key_lower or "score" in key_lower:
                col_map["rating"] = key
            elif "title" in key_lower and "review" in key_lower:
                col_map["title"] = key
            elif "title" in key_lower and "product" not in key_lower:
                col_map["title"] = key
            elif any(k in key_lower for k in ["review", "comment", "feedback", "body", "customer_text", "text"]):
                col_map["body"] = key
            elif any(k in key_lower for k in ["reviewer", "author", "user", "customer_name"]):
                col_map["reviewer"] = key
            elif "date" in key_lower or "created_at" in key_lower:
                col_map["date"] = key

    # If the CSV doesn't have any rating, review body, or review title columns, skip
    has_review_content = bool(col_map.get("rating") or col_map.get("body") or col_map.get("title"))
    if not has_review_content:
        return []

    for row in rows:
        product_name = str(row.get(col_map.get("product_name", "product_name"), "")).strip()
        if not product_name or product_name.lower() in ("unknown", "n/a", "none"):
            product_name = str(row.get("name", row.get("product", "Unknown"))).strip()

        try:
            rating = float(row.get(col_map.get("rating", "rating"), 0))
        except (ValueError, TypeError):
            rating = 0.0

        title = str(row.get(col_map.get("title", "title"), "")).strip()
        body = str(row.get(col_map.get("body", "review_text"), "")).strip()
        reviewer = str(row.get(col_map.get("reviewer", "reviewer"), "Anonymous")).strip()
        date = str(row.get(col_map.get("date", "date"), "")).strip()

        # Only create a review if actual review or rating data exists in this row
        if rating > 0 or body or title:
            reviews.append(ExtractedReview(
                product_slug=slugify(product_name),
                product_name=product_name,
                rating=rating,
                title=title,
                body=body,
                reviewer=reviewer or "Anonymous",
                date=date,
                source_file=source_name,
            ))

    return reviews


def _synthesize_reviews(product_name: str, product_slug: str, reviews: list[ExtractedReview]) -> ReviewSynthesis:
    """Use LLM to synthesize reviews into sentiment summary."""
    ratings = [r["rating"] for r in reviews if r["rating"] > 0]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0

    review_texts = []
    for r in reviews[:30]:  # Limit to 30 for token limits
        review_texts.append({
            "rating": r["rating"],
            "title": r["title"],
            "body": r["body"][:300],
            "reviewer": r["reviewer"],
        })

    prompt = (
        f"Synthesize these customer reviews for '{product_name}'.\n\n"
        f"Average rating: {avg_rating}/5 from {len(reviews)} reviews.\n\n"
        f"Reviews:\n{json.dumps(review_texts, indent=2)}\n\n"
        f"Return JSON with:\n"
        f"- sentiment_summary: 2-3 sentence overall sentiment\n"
        f"- top_pros: list of top 5 things customers like\n"
        f"- top_cons: list of top 5 common complaints\n"
        f"- best_reviews: list of 3 most helpful reviews with title, reviewer, rating, excerpt\n\n"
        f"Return JSON: {{\"sentiment_summary\": \"...\", \"top_pros\": [...], \"top_cons\": [...], \"best_reviews\": [...]}}"
    )

    try:
        result = call_llm_json(prompt, system="You are a review analyst. Synthesize customer feedback objectively.")

        return ReviewSynthesis(
            product_slug=product_slug,
            product_name=product_name,
            avg_rating=avg_rating,
            total_reviews=len(reviews),
            sentiment_summary=result.get("sentiment_summary", ""),
            top_pros=result.get("top_pros", []),
            top_cons=result.get("top_cons", []),
            best_reviews=result.get("best_reviews", []),
        )
    except Exception as e:
        print(f"  Error synthesizing reviews for {product_name}: {e}")
        return ReviewSynthesis(
            product_slug=product_slug,
            product_name=product_name,
            avg_rating=avg_rating,
            total_reviews=len(reviews),
            sentiment_summary=f"Based on {len(reviews)} reviews with average rating {avg_rating}/5.",
            top_pros=[],
            top_cons=[],
            best_reviews=[],
        )


def extract_reviews(state: WikiState) -> dict:
    """
    Parse review CSV data from DB state and synthesize per-product sentiment.
    Checks dedicated 'review'/'reviews' sources as well as any catalog/inventory sources
    that contain embedded rating or review columns.
    """
    classified = state.get("classified_sources", {})
    all_reviews: list[ExtractedReview] = []

    # 1. Dedicated review sources
    review_sources = list(classified.get("review", []) + classified.get("reviews", []))

    # 2. Also check catalog, inventory, and document sources for embedded review/rating columns
    candidate_categories = ["catalog", "inventory", "products", "promotion", "promotions", "documents", "document"]
    for cat in candidate_categories:
        for src in classified.get(cat, []):
            if src in review_sources:
                continue
            raw_csv = src.get("data", "")
            first_line = raw_csv.split("\n")[0].lower() if raw_csv else ""
            if any(k in first_line for k in ["rating", "star", "review", "feedback", "comment", "score"]):
                review_sources.append(src)

    for index, source_item in enumerate(review_sources):
        raw_csv = source_item.get("data", "")
        cat_name = source_item.get("category", "review")
        source_name = f"db_{cat_name}_{index + 1}"

        rows = _parse_csv_data(raw_csv)
        if not rows:
            continue

        reviews = _parse_review_rows(rows, source_name=source_name)
        all_reviews.extend(reviews)

    if not all_reviews:
        print("  No reviews found in DB state")
        return {"extracted_reviews": [], "review_syntheses": []}

    # Group reviews by product
    by_product: dict[str, list[ExtractedReview]] = defaultdict(list)
    for review in all_reviews:
        by_product[review["product_slug"]].append(review)

    # Synthesize per product
    syntheses: list[ReviewSynthesis] = []
    for slug, reviews in by_product.items():
        product_name = reviews[0]["product_name"]
        synthesis = _synthesize_reviews(product_name, slug, reviews)
        syntheses.append(synthesis)

    print(f"  Processed {len(all_reviews)} reviews for {len(syntheses)} products")
    return {
        "extracted_reviews": all_reviews,
        "review_syntheses": syntheses,
    }
