"""
search_existing_wiki — LLM + DETERMINISTIC NODE

Searches the wiki for existing pages that match the extracted entities.
This is THE critical node for incremental maintenance:
  - If a product page exists → route to UPDATE
  - If it doesn't → route to CREATE
"""

try:
    from ..state import WikiState
    from ..utils.file_io import list_wiki_pages, read_markdown, slugify
    from ..utils.wiki_search import fuzzy_match_slug
except (ImportError, ValueError):
    from src.agents.store_manager_llm.state import WikiState
    from src.agents.store_manager_llm.utils.file_io import list_wiki_pages, read_markdown, slugify
    from src.agents.store_manager_llm.utils.wiki_search import fuzzy_match_slug


def search_existing_wiki(state: WikiState) -> dict:
    """
    For each extracted product, check if a wiki page already exists.
    Populates existing_pages dict: slug → file_path.
    """
    wiki_base = state["wiki_base_path"]
    section = state.get("wiki_section", "knowledge")
    extracted_products = state.get("extracted_products", [])

    # Get all existing pages across all page types
    wiki_dir = f"{wiki_base}/wiki"
    existing = list_wiki_pages(wiki_dir, section)

    # Also check the other section for cross-references
    other_section = "marketing" if section == "knowledge" else "knowledge"
    other_existing = list_wiki_pages(wiki_dir, other_section)

    # Match extracted products against existing pages
    matched_pages: dict[str, str] = {}

    for product in extracted_products:
        slug = product["slug"]

        # Direct match
        if slug in existing:
            matched_pages[slug] = existing[slug]
            continue

        # Fuzzy match
        fuzzy_results = fuzzy_match_slug(slug, list(existing.keys()), threshold=80)
        if fuzzy_results:
            best_match = fuzzy_results[0]
            matched_pages[slug] = existing[best_match[0]]
            print(f" Fuzzy matched '{slug}' → '{best_match[0]}' (score: {best_match[1]:.0f})")
            continue

    found = len(matched_pages)
    total = len(extracted_products)
    new = total - found
    print(f" Wiki search: {found} existing pages found, {new} new products")

    return {"existing_pages": matched_pages}
