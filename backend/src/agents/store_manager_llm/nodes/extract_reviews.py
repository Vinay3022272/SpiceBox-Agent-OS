"""
extract_reviews — LLM NODE

Parses review CSVs and synthesizes per-product sentiment.
Individual reviews stay in the CSV (not one .md each).
The wiki gets synthesized sentiment per product.
"""

import json
from collections import defaultdict

try:
    from ..state import WikiState, ExtractedReview, ReviewSynthesis
    from ..utils.llm import call_llm_json
    from ..utils.csv_reader import read_csv
    from ..utils.file_io import slugify
except (ImportError, ValueError):
    from src.agents.store_manager_llm.state import WikiState, ExtractedReview, ReviewSynthesis
    from src.agents.store_manager_llm.utils.llm import call_llm_json
    from src.agents.store_manager_llm.utils.csv_reader import read_csv
    from src.agents.store_manager_llm.utils.file_io import slugify


def _parse_review_rows(rows: list[dict], source_file: str) -> list[ExtractedReview]:
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
            elif "product" in key_lower:
                col_map["product_name"] = key
            elif "name" in key_lower and "product" not in col_map:
                col_map["product_name"] = key
            elif "rating" in key_lower or "star" in key_lower:
                col_map["rating"] = key
            elif "title" in key_lower:
                col_map["title"] = key
            elif "review" in key_lower or "comment" in key_lower or "feedback" in key_lower or "body" in key_lower or "text" in key_lower:
                col_map["body"] = key
            elif "reviewer" in key_lower or "author" in key_lower or "user" in key_lower:
                col_map["reviewer"] = key
            elif "date" in key_lower:
                col_map["date"] = key

    for row in rows:
        product_name = str(row.get(col_map.get("product_name", "product_name"), "Unknown"))
        try:
            rating = float(row.get(col_map.get("rating", "rating"), 0))
        except (ValueError, TypeError):
            rating = 0.0

        reviews.append(ExtractedReview(
            product_slug=slugify(product_name),
            product_name=product_name,
            rating=rating,
            title=str(row.get(col_map.get("title", "title"), "")),
            body=str(row.get(col_map.get("body", "review_text"), "")),
            reviewer=str(row.get(col_map.get("reviewer", "reviewer"), "Anonymous")),
            date=str(row.get(col_map.get("date", "date"), "")),
            source_file=source_file,
        ))

    return reviews


def _synthesize_reviews(product_name: str, product_slug: str, reviews: list[ExtractedReview]) -> ReviewSynthesis:
    """Use LLM to synthesize reviews into sentiment summary."""
    # Calculate basic stats
    ratings = [r["rating"] for r in reviews if r["rating"] > 0]
    avg_rating = round(sum(ratings) / len(ratings), 1) if ratings else 0.0

    # Prepare review texts for LLM
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
        print(f"    ⚠️ Error synthesizing reviews for {product_name}: {e}")
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
    Parse review CSVs and synthesize per-product sentiment.
    """
    classified = state.get("classified_sources", {})
    all_reviews: list[ExtractedReview] = []

    # Parse all review files
    for file_info in classified.get("review", []):
        try:
            rows = read_csv(file_info["path"])
            reviews = _parse_review_rows(rows, file_info["filename"])
            all_reviews.extend(reviews)
        except Exception as e:
            print(f"  Error processing reviews from {file_info['filename']}: {e}")

    if not all_reviews:
        print(" No review files found")
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

    print(f" Processed {len(all_reviews)} reviews for {len(syntheses)} products")
    return {
        "extracted_reviews": all_reviews,
        "review_syntheses": syntheses,
    }
