import json

from ..state import WikiState, WikiPage, Contradiction
from ..utils.file_io import read_markdown, get_page_path
from ..utils.llm import call_llm_json


def knowledge_diff(state: WikiState) -> dict:
    """
    Diff new extracted info vs existing wiki pages.
    Populates pages_to_create, pages_to_update, and contradictions.
    """
    extracted_products = state.get("extracted_products", [])
    existing_pages = state.get("existing_pages", {})
    review_syntheses = state.get("review_syntheses", [])
    review_map = {rs.get("product_slug"): rs for rs in review_syntheses if "product_slug" in rs}
    wiki_base = state.get("wiki_base_path", "")
    section = state.get("wiki_section", "knowledge")

    pages_to_create: list[WikiPage] = []
    pages_to_update: list[WikiPage] = []
    contradictions: list[Contradiction] = []

    for product in extracted_products:
        slug = product.get("slug")
        if not slug:
            continue

        name = product.get("name", "Unknown Product")
        source_id = product.get("source_file", "db_source")
        page_type = "products"

        # Determine page type for marketing section
        if section == "marketing":
            raw_data = str(product.get("raw_data", {})).lower()
            rated_slugs = {r.get("product_slug") for r in review_syntheses if r.get("avg_rating", 0) >= 4.0 and r.get("total_reviews", 0) > 0}
            if any(k in raw_data for k in ["promotion", "discount", "offer", "deal", "promo_code"]):
                page_type = "promotions"
            elif any(k in raw_data for k in ["special", "signature", "unique"]):
                page_type = "specialties"
            elif slug in rated_slugs:
                page_type = "popular"
            else:
                # No verifiable marketing or promotional signal — skip fabricating pages
                continue

        file_path = get_page_path(wiki_base, section, page_type, slug)

        if slug in existing_pages:
            # Page exists — diff using fast-check first, LLM if modified
            existing_file_path = existing_pages[slug]
            try:
                existing_content = read_markdown(existing_file_path)
            except Exception as e:
                print(f"  Error reading existing file '{existing_file_path}': {e}")
                existing_content = ""

            clean_price = str(product.get("price", "")).strip()
            clean_name = str(product.get("name", "")).strip()

            # Check if this product has newly synthesized reviews missing from existing page
            review = review_map.get(slug)
            has_new_reviews = False
            if review and review.get("total_reviews", 0) > 0:
                if "_No review data available yet._" in existing_content:
                    has_new_reviews = True
                elif f"{review.get('avg_rating')}" not in existing_content:
                    has_new_reviews = True

            if has_new_reviews:
                pages_to_update.append(WikiPage(
                    slug=slug,
                    section=section,
                    page_type=page_type,
                    title=name,
                    content="",
                    file_path=existing_file_path,
                    metadata={"slug": slug, "section": section, "page_type": page_type, "has_new_reviews": True},
                ))
                continue

            # If name and price are already present in existing page, consider unchanged
            if clean_price and clean_name and (clean_price in existing_content) and (clean_name in existing_content):
                continue

            if existing_content.strip():
                new_info = json.dumps({
                    "name": name,
                    "brand": product.get("brand", ""),
                    "category": product.get("category", ""),
                    "price": product.get("price", ""),
                    "specifications": product.get("specifications", {}),
                    "description": product.get("description", ""),
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
                            new_source=source_id,
                            resolution="pending",
                            preferred_source="",
                        ))

                    if diff_result.get("has_new_info") or diff_result.get("contradictions"):
                        pages_to_update.append(WikiPage(
                            slug=slug,
                            title=name,
                            page_type=page_type,
                            section=section,
                            file_path=existing_file_path,
                            content="",  # Will be generated by update_pages node
                            sources=[source_id],
                            links=[],
                        ))
                except Exception as e:
                    print(f"  Error diffing '{slug}': {e}")
                    pages_to_update.append(WikiPage(
                        slug=slug,
                        title=name,
                        page_type=page_type,
                        section=section,
                        file_path=existing_file_path,
                        content="",
                        sources=[source_id],
                        links=[],
                    ))
            else:
                # Existing file was empty -> queue for update
                pages_to_update.append(WikiPage(
                    slug=slug,
                    title=name,
                    page_type=page_type,
                    section=section,
                    file_path=existing_file_path,
                    content="",
                    sources=[source_id],
                    links=[],
                ))
        else:
            # New product -> queue for creation
            pages_to_create.append(WikiPage(
                slug=slug,
                title=name,
                page_type=page_type,
                section=section,
                file_path=file_path,
                content="",  # Will be generated by create_pages node
                sources=[source_id],
                links=[],
            ))

    print(f"  Knowledge diff complete: {len(pages_to_create)} to create, {len(pages_to_update)} to update, {len(contradictions)} conflicts")

    return {
        "pages_to_create": pages_to_create,
        "pages_to_update": pages_to_update,
        "contradictions": contradictions,
    }
