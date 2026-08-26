"""
knowledge_diff — LLM NODE

Compares newly extracted information against existing wiki pages.
Routes products to CREATE or UPDATE lists.
Detects contradictions for the resolve_conflicts node.
"""

import json
try:
    from ..state import WikiState, WikiPage, Contradiction
    from ..utils.file_io import read_markdown, get_page_path, slugify
    from ..utils.llm import call_llm_json
except (ImportError, ValueError):
    from src.agents.store_manager_llm.state import WikiState, WikiPage, Contradiction
    from src.agents.store_manager_llm.utils.file_io import read_markdown, get_page_path, slugify
    from src.agents.store_manager_llm.utils.llm import call_llm_json


def knowledge_diff(state: WikiState) -> dict:
    """
    Diff new info vs existing pages.
    Populates pages_to_create, pages_to_update, and contradictions.
    """
    extracted_products = state.get("extracted_products", [])
    existing_pages = state.get("existing_pages", {})
    review_syntheses = state.get("review_syntheses", [])
    wiki_base = state["wiki_base_path"]
    section = state.get("wiki_section", "knowledge")

    # Build review lookup
    review_map = {rs["product_slug"]: rs for rs in review_syntheses}

    pages_to_create: list[WikiPage] = []
    pages_to_update: list[WikiPage] = []
    contradictions: list[Contradiction] = []

    for product in extracted_products:
        slug = product["slug"]
        page_type = "products"

        # Determine the correct page type based on section
        if section == "marketing":
            # Check if it's a promotion or specialty
            raw_data = product.get("raw_data", {})
            if any(k in str(raw_data).lower() for k in ["promotion", "discount", "offer", "deal"]):
                page_type = "promotions"
            elif any(k in str(raw_data).lower() for k in ["special", "signature", "unique"]):
                page_type = "specialties"
            else:
                page_type = "popular"

        file_path = get_page_path(wiki_base, section, page_type, slug)

        if slug in existing_pages:
            # Page exists — need to diff and update
            existing_content = read_markdown(existing_pages[slug])

            if existing_content.strip():
                # Use LLM to detect what's new and what conflicts
                new_info = json.dumps({
                    "name": product["name"],
                    "brand": product["brand"],
                    "category": product["category"],
                    "price": product["price"],
                    "specifications": product["specifications"],
                    "description": product["description"],
                }, indent=2)

                prompt = (
                    f"Compare NEW product data against the EXISTING wiki page content.\n\n"
                    f"EXISTING PAGE:\n{existing_content[:3000]}\n\n"
                    f"NEW DATA:\n{new_info}\n\n"
                    f"Identify:\n"
                    f"1. What information is genuinely new (not in existing page)\n"
                    f"2. What information contradicts existing content\n"
                    f"3. What information is unchanged\n\n"
                    f"Return JSON:\n"
                    f"{{\n"
                    f"  \"has_new_info\": true/false,\n"
                    f"  \"new_fields\": [\"field1\", \"field2\"],\n"
                    f"  \"contradictions\": [\n"
                    f"    {{\"field\": \"...\", \"existing_value\": \"...\", \"new_value\": \"...\"}}\n"
                    f"  ],\n"
                    f"  \"unchanged_fields\": [\"field1\", \"field2\"]\n"
                    f"}}"
                )

                try:
                    diff_result = call_llm_json(prompt, system="You are a knowledge diff analyzer.")

                    # Record contradictions
                    for conflict in diff_result.get("contradictions", []):
                        contradictions.append(Contradiction(
                            product_slug=slug,
                            field=conflict.get("field", "unknown"),
                            existing_value=conflict.get("existing_value", ""),
                            new_value=conflict.get("new_value", ""),
                            existing_source="existing wiki page",
                            new_source=product.get("source_file", ""),
                            resolution="pending",
                            preferred_source="",
                        ))

                    if diff_result.get("has_new_info") or diff_result.get("contradictions"):
                        pages_to_update.append(WikiPage(
                            slug=slug,
                            title=product["name"],
                            page_type=page_type,
                            section=section,
                            file_path=existing_pages[slug],
                            content="",  # Will be filled by update_pages
                            sources=[product.get("source_file", "")],
                            links=[],
                        ))
                except Exception as e:
                    print(f" Error diffing {slug}: {e}")
                    # Default to update if diff fails
                    pages_to_update.append(WikiPage(
                        slug=slug,
                        title=product["name"],
                        page_type=page_type,
                        section=section,
                        file_path=existing_pages[slug],
                        content="",
                        sources=[product.get("source_file", "")],
                        links=[],
                    ))
        else:
            # New product — create page
            pages_to_create.append(WikiPage(
                slug=slug,
                title=product["name"],
                page_type=page_type,
                section=section,
                file_path=file_path,
                content="",  # Will be filled by create_pages
                sources=[product.get("source_file", "")],
                links=[],
            ))

    create_count = len(pages_to_create)
    update_count = len(pages_to_update)
    conflict_count = len(contradictions)
    print(f" Knowledge diff: {create_count} to create, {update_count} to update, {conflict_count} conflicts")

    return {
        "pages_to_create": pages_to_create,
        "pages_to_update": pages_to_update,
        "contradictions": contradictions,
    }
