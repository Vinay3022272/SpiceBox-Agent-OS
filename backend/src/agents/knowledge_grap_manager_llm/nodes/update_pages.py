from datetime import datetime
from ..state import WikiState
from ..utils.file_io import read_markdown, write_markdown
from ..utils.llm import call_llm


def update_pages(state: WikiState) -> dict:
    """
    Update existing wiki pages with new information fetched from DB.
    Uses LLM to intelligently merge new data into existing content.
    """
    pages_to_update = state.get("pages_to_update", [])
    extracted_products = state.get("extracted_products", [])
    review_syntheses = state.get("review_syntheses", [])
    contradictions = state.get("contradictions", [])

    if not pages_to_update:
        return {"generated_pages": state.get("generated_pages", [])}

    # Build lookups
    product_map = {p.get("slug"): p for p in extracted_products if "slug" in p}
    review_map = {rs.get("product_slug"): rs for rs in review_syntheses if "product_slug" in rs}

    conflict_map: dict[str, list] = {}
    for c in contradictions:
        prod_slug = c.get("product_slug")
        if prod_slug:
            if prod_slug not in conflict_map:
                conflict_map[prod_slug] = []
            conflict_map[prod_slug].append(c)

    generated = list(state.get("generated_pages", []))

    for page in pages_to_update:
        slug = page.get("slug")
        file_path = page.get("file_path", "")

        try:
            existing_content = read_markdown(file_path)
        except Exception as e:
            print(f"  Error reading existing file '{file_path}': {e}")
            existing_content = ""

        product = product_map.get(slug)

        if not product or not existing_content:
            continue

        # Format the new information block
        new_info_parts = []
        new_info_parts.append(f"Product: {product.get('name', 'Unknown')}")
        new_info_parts.append(f"Brand: {product.get('brand', 'N/A')}")
        new_info_parts.append(f"Category: {product.get('category', 'N/A')}")
        new_info_parts.append(f"Price: {product.get('price', 'N/A')} {product.get('currency', 'INR')}")
        new_info_parts.append(f"Description: {product.get('description', 'N/A')}")

        specs = product.get("specifications", {})
        if specs:
            new_info_parts.append("Specifications:")
            for k, v in specs.items():
                new_info_parts.append(f"  - {k}: {v}")

        # Add review data if available
        review = review_map.get(slug)
        if review:
            new_info_parts.append(f"\nReview Summary:")
            new_info_parts.append(f"  Rating: {review.get('avg_rating', 'N/A')}/5 ({review.get('total_reviews', 0)} reviews)")
            new_info_parts.append(f"  Sentiment: {review.get('sentiment_summary', '')}")

        # Add conflicts if present
        conflicts = conflict_map.get(slug, [])
        if conflicts:
            new_info_parts.append("\nConflicts detected:")
            for c in conflicts:
                new_info_parts.append(f"  - {c.get('field')}: was '{c.get('existing_value')}', now '{c.get('new_value')}'")

        new_info = "\n".join(new_info_parts)
        source_id = product.get("source_file", "db_source")

        prompt = (
            f"You are updating an existing product wiki page with new information.\n\n"
            f"RULES:\n"
            f"1. Keep ALL existing content that is still valid\n"
            f"2. Integrate new information into appropriate sections\n"
            f"3. Do NOT remove existing source references\n"
            f"4. Add conflict blocks for contradictions (use > ⚠️ format)\n"
            f"5. Update the last_updated date to {datetime.now().strftime('%Y-%m-%d')}\n"
            f"6. Add the new source identifier ({source_id}) to the Sources section\n"
            f"7. Maintain the same markdown structure\n\n"
            f"EXISTING PAGE:\n{existing_content}\n\n"
            f"NEW INFORMATION:\n{new_info}\n\n"
            f"New source identifier: {source_id}\n\n"
            f"Return the COMPLETE updated page in markdown format."
        )

        try:
            updated_content = call_llm(
                prompt,
                system="You are a wiki page editor. Merge new data into existing pages carefully.",
                max_tokens=8192,
            )
            write_markdown(file_path, updated_content)

            page_with_content = dict(page)
            page_with_content["content"] = updated_content
            generated.append(page_with_content)

            print(f"  Updated wiki page: {page.get('section')}/{page.get('page_type')}/{slug}.md")
        except Exception as e:
            print(f"  Error updating wiki page for '{slug}': {e}")

    print(f"  Successfully updated {len(pages_to_update)} existing pages")
    return {"generated_pages": generated}
