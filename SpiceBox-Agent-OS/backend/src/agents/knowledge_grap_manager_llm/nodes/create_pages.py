import json
from pathlib import Path
from datetime import datetime
from jinja2 import Template

from ..state import WikiState, WikiPage
from ..utils.file_io import write_markdown, get_page_path, slugify, page_exists
from ..utils.llm import call_llm, call_llm_json


def _load_template(template_name: str) -> Template:
    """Load a Jinja2 template from the templates directory."""
    template_dir = Path(__file__).parent.parent / "templates"
    template_path = template_dir / template_name
    if template_path.exists():
        return Template(template_path.read_text(encoding="utf-8"))
    # Fallback to a basic Markdown template if template file is missing
    return Template("# {{ name }}\n\n{{ description }}\n")


def _generate_product_page(product: dict, review_synthesis: dict | None, section: str) -> str:
    """Generate a product wiki page using Jinja2 template + LLM enrichment."""
    template = _load_template("product_page.md")

    # Build template context
    context = {
        "slug": product.get("slug", ""),
        "name": product.get("name", "Unknown Product"),
        "brand": product.get("brand", "Unknown"),
        "category": product.get("category", "Uncategorized"),
        "price": product.get("price", "N/A"),
        "currency": product.get("currency", "INR"),
        "original_price": None,
        "discount": None,
        "description": product.get("description", ""),
        "specifications": product.get("specifications", {}),
        "sentiment": None,
        "conflicts": [],
        "related_links": [],
        "sources": [product.get("source_file", "db_source")],
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
    }

    category_name = product.get("category", "")
    if category_name and category_name != "Uncategorized":
        cat_slug = slugify(category_name)
        context["related_links"].append(f"[{category_name}](../categories/{cat_slug}.md) (Category)")

    # Add review synthesis if available
    if review_synthesis:
        context["sentiment"] = {
            "avg_rating": review_synthesis.get("avg_rating", 0),
            "total_reviews": review_synthesis.get("total_reviews", 0),
            "sentiment_summary": review_synthesis.get("sentiment_summary", ""),
            "top_pros": review_synthesis.get("top_pros", []),
            "top_cons": review_synthesis.get("top_cons", []),
            "best_reviews": review_synthesis.get("best_reviews", []),
        }

    # Enrich description using LLM if too short
    if len(context["description"]) < 50:
        specs_text = "\n".join(f"- {k}: {v}" for k, v in context["specifications"].items())
        prompt = (
            f"Write a concise 2-3 sentence product overview for '{context['name']}' "
            f"by {context['brand']}.\n\n"
            f"Category: {context['category']}\n"
            f"Price: {context['price']}\n"
            f"Specifications:\n{specs_text}\n\n"
            f"Write factually based only on the provided information. Do not invent features."
        )
        try:
            context["description"] = call_llm(prompt, system="You write concise product overviews.")
        except Exception as e:
            print(f"  Warning: LLM description enrichment failed for '{context['slug']}': {e}")

    return template.render(**context)


def _generate_marketing_page(product: dict, page_type: str, review_synthesis: dict | None = None) -> str:
    """Generate a marketing page (promotions/specialties/popular)."""
    if page_type == "promotions":
        template = _load_template("promotion_page.md")
    elif page_type == "popular":
        template = _load_template("popular_page.md")
    else:
        template = _load_template("promotion_page.md")

    # Filter out raw payload before sending to LLM
    product_info = json.dumps({k: v for k, v in product.items() if k != "raw_data"}, indent=2, default=str)

    prompt = (
        f"Generate marketing intelligence for this product:\n\n{product_info}\n\n"
        f"Page type: {page_type}\n\n"
        f"Return JSON with:\n"
        f"- why_promote: why this product should be promoted (2-3 sentences)\n"
        f"- selling_points: list of 3-5 key selling points\n"
        f"- target_audience: list of 2-3 target customer segments\n"
        f"- revenue_note: brief revenue impact note\n"
        f"- popularity_reason: why this is popular (if applicable)\n"
    )

    try:
        marketing = call_llm_json(prompt, system="You are a marketing strategist for e-commerce.")
    except Exception:
        marketing = {
            "why_promote": f"{product.get('name', 'Product')} is a strong offering in its category.",
            "selling_points": ["Quality product", "Competitive pricing"],
            "target_audience": ["General consumers"],
            "revenue_note": "Standard revenue potential.",
            "popularity_reason": "Solid product with positive engagement.",
        }

    prod_category = product.get("category", "")
    rating_val = review_synthesis.get("avg_rating", "N/A") if review_synthesis else "N/A"
    review_cnt = review_synthesis.get("total_reviews", 0) if review_synthesis else 0
    highlights = [
        b.get("excerpt") or b.get("title")
        for b in (review_synthesis.get("best_reviews", []) if review_synthesis else [])
        if b.get("excerpt") or b.get("title")
    ]
    if review_synthesis and not highlights and review_synthesis.get("sentiment_summary"):
        highlights = [review_synthesis.get("sentiment_summary")]

    context = {
        "slug": product.get("slug", ""),
        "name": product.get("name", ""),
        "product_slug": product.get("slug", ""),
        "product_name": product.get("name", ""),
        "promotion_type": page_type.replace("_", " ").title(),
        "category": prod_category,
        "category_slug": slugify(prod_category) if prod_category else "general",
        "price": product.get("price", "N/A"),
        "currency": product.get("currency", "INR"),
        "rating": rating_val,
        "review_count": review_cnt,
        "ranking": 0,
        "discount": None,
        "valid_until": None,
        "why_promote": marketing.get("why_promote", ""),
        "selling_points": marketing.get("selling_points", []),
        "target_audience": marketing.get("target_audience", []),
        "revenue_note": marketing.get("revenue_note", ""),
        "revenue_recommendation": marketing.get("revenue_note", ""),
        "popularity_reason": marketing.get("popularity_reason", ""),
        "customer_evidence": "",
        "customer_highlights": highlights,
        "pairings": [],
        "sources": [product.get("source_file", "db_source")],
        "last_updated": datetime.now().strftime("%Y-%m-%d"),
    }

    return template.render(**context)


def create_pages(state: WikiState) -> dict:
    """
    Create new wiki pages for all products in `pages_to_create`.
    """
    pages_to_create = state.get("pages_to_create", [])
    extracted_products = state.get("extracted_products", [])
    review_syntheses = state.get("review_syntheses", [])
    wiki_base = state.get("wiki_base_path", "")
    section = state.get("wiki_section", "knowledge")

    if not pages_to_create:
        return {"generated_pages": []}

    product_map = {p["slug"]: p for p in extracted_products if "slug" in p}
    review_map = {rs["product_slug"]: rs for rs in review_syntheses if "product_slug" in rs}

    generated: list[WikiPage] = []

    for page in pages_to_create:
        slug = page.get("slug")
        product = product_map.get(slug)

        if not product:
            continue

        # Generate page content
        review_data = review_map.get(slug)
        if section == "knowledge":
            content = _generate_product_page(product, review_data, section)
        else:
            content = _generate_marketing_page(product, page.get("page_type", "popular"), review_data)

        # Write markdown file
        file_path = page["file_path"]
        write_markdown(file_path, content)

        page_with_content = dict(page)
        page_with_content["content"] = content
        generated.append(page_with_content)

        print(f"  Created wiki page: {section}/{page.get('page_type', 'products')}/{slug}.md")

    # Generate Category pages for knowledge section
    if section == "knowledge":
        categories = set()
        for product in extracted_products:
            cat = product.get("category")
            if cat:
                categories.add(cat)

        for cat_name in categories:
            cat_slug = slugify(cat_name)

            if not page_exists(wiki_base, section, "categories", cat_slug):
                cat_products = [p for p in extracted_products if slugify(p.get("category", "")) == cat_slug]

                template = _load_template("category_page.md")
                context = {
                    "slug": cat_slug,
                    "name": cat_name,
                    "description": f"Products in the {cat_name} category.",
                    "products": [{
                        "slug": p.get("slug", ""),
                        "name": p.get("name", ""),
                        "brand": p.get("brand", ""),
                        "price": p.get("price", "N/A"),
                        "currency": p.get("currency", "INR"),
                        "rating": review_map.get(p.get("slug", ""), {}).get("avg_rating", "N/A"),
                        "review_count": review_map.get(p.get("slug", ""), {}).get("total_reviews", 0),
                    } for p in cat_products],
                    "top_rated": [],
                    "price_range": None,
                    "currency": "INR",
                    "trends": f"Category contains {len(cat_products)} products.",
                    "sources": list(set(p.get("source_file", "db_source") for p in cat_products)),
                    "last_updated": datetime.now().strftime("%Y-%m-%d"),
                }

                cat_content = template.render(**context)
                cat_path = get_page_path(wiki_base, section, "categories", cat_slug)
                write_markdown(cat_path, cat_content)
                print(f"  Created category page: {section}/categories/{cat_slug}.md")

    print(f"  Successfully created {len(generated)} new pages")
    return {"generated_pages": generated}
