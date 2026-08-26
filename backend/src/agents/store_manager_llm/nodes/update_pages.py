"""
update_pages — LLM NODE

Merges new information into existing wiki pages.
Never overwrites — always integrates.
"""

from datetime import datetime

try:
    from ..state import WikiState, WikiPage
    from ..utils.file_io import read_markdown, write_markdown
    from ..utils.llm import call_llm
except (ImportError, ValueError):
    from src.agents.store_manager_llm.state import WikiState, WikiPage
    from src.agents.store_manager_llm.utils.file_io import read_markdown, write_markdown
    from src.agents.store_manager_llm.utils.llm import call_llm


def update_pages(state: WikiState) -> dict:
    """
    Update existing wiki pages with new information.
    Uses LLM to intelligently merge new data into existing content.
    """
    pages_to_update = state.get("pages_to_update", [])
    extracted_products = state.get("extracted_products", [])
    review_syntheses = state.get("review_syntheses", [])
    contradictions = state.get("contradictions", [])

    if not pages_to_update:
        return {"generated_pages": state.get("generated_pages", [])}

    # Build lookups
    product_map = {p["slug"]: p for p in extracted_products}
    review_map = {rs["product_slug"]: rs for rs in review_syntheses}
    conflict_map: dict[str, list] = {}
    for c in contradictions:
        if c["product_slug"] not in conflict_map:
            conflict_map[c["product_slug"]] = []
        conflict_map[c["product_slug"]].append(c)

    generated = list(state.get("generated_pages", []))

    for page in pages_to_update:
        slug = page["slug"]
        existing_content = read_markdown(page["file_path"])
        product = product_map.get(slug)

        if not product or not existing_content:
            continue

        # Build the new information block
        new_info_parts = []
        new_info_parts.append(f"Product: {product['name']}")
        new_info_parts.append(f"Brand: {product.get('brand', 'N/A')}")
        new_info_parts.append(f"Category: {product.get('category', 'N/A')}")
        new_info_parts.append(f"Price: {product.get('price', 'N/A')} {product.get('currency', 'INR')}")
        new_info_parts.append(f"Description: {product.get('description', 'N/A')}")

        if product.get("specifications"):
            new_info_parts.append("Specifications:")
            for k, v in product["specifications"].items():
                new_info_parts.append(f"  - {k}: {v}")

        # Add review data if available
        review = review_map.get(slug)
        if review:
            new_info_parts.append(f"\nReview Summary:")
            new_info_parts.append(f"  Rating: {review['avg_rating']}/5 ({review['total_reviews']} reviews)")
            new_info_parts.append(f"  Sentiment: {review['sentiment_summary']}")

        # Add contradictions
        conflicts = conflict_map.get(slug, [])
        if conflicts:
            new_info_parts.append("\nConflicts detected:")
            for c in conflicts:
                new_info_parts.append(f"  - {c['field']}: was '{c['existing_value']}', now '{c['new_value']}'")

        new_info = "\n".join(new_info_parts)

        prompt = (
            f"You are updating an existing product wiki page with new information.\n\n"
            f"RULES:\n"
            f"1. Keep ALL existing content that is still valid\n"
            f"2. Integrate new information into appropriate sections\n"
            f"3. Do NOT remove existing source references\n"
            f"4. Add conflict blocks for contradictions (use > ⚠️ format)\n"
            f"5. Update the last_updated date to {datetime.now().strftime('%Y-%m-%d')}\n"
            f"6. Add the new source file to the Sources section\n"
            f"7. Maintain the same markdown structure\n\n"
            f"EXISTING PAGE:\n{existing_content}\n\n"
            f"NEW INFORMATION:\n{new_info}\n\n"
            f"New source file: {product.get('source_file', 'unknown')}\n\n"
            f"Return the COMPLETE updated page in markdown format."
        )

        try:
            updated_content = call_llm(
                prompt,
                system="You are a wiki page editor. Merge new data into existing pages carefully.",
                max_tokens=8192,
            )
            write_markdown(page["file_path"], updated_content)

            page_with_content = dict(page)
            page_with_content["content"] = updated_content
            generated.append(page_with_content)

            print(f"  Updated: {page['section']}/{page['page_type']}/{slug}.md")
        except Exception as e:
            print(f" Error updating {slug}: {e}")

    print(f" Updated {len(pages_to_update)} existing pages")
    return {"generated_pages": generated}
