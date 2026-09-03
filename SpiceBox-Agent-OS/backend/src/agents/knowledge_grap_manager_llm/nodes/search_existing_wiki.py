from ..state import WikiState
from ..utils.file_io import list_wiki_pages, slugify
from ..utils.wiki_search import fuzzy_match_slug


def search_existing_wiki(state: WikiState) -> dict:
    """
    For each extracted product, check if a wiki page already exists in the repository.
    Populates existing_pages dict: slug -> file_path.
    """
    wiki_base = state.get("wiki_base_path", "")
    section = state.get("wiki_section", "knowledge")
    extracted_products = state.get("extracted_products", [])

    if not extracted_products:
        print("  No extracted products to match against existing wiki pages.")
        return {"existing_pages": {}}

    # Get all existing pages across page types in current section
    wiki_dir = f"{wiki_base}/wiki"
    try:
        existing = list_wiki_pages(wiki_dir, section)
    except Exception as e:
        print(f"  Error reading wiki pages from '{wiki_dir}': {e}")
        existing = {}

    # Match extracted products against existing pages
    matched_pages: dict[str, str] = {}

    for product in extracted_products:
        slug = product.get("slug")
        if not slug:
            continue

        # Direct match
        if slug in existing:
            matched_pages[slug] = existing[slug]
            continue

        # Fuzzy match (threshold = 80%)
        fuzzy_results = fuzzy_match_slug(slug, list(existing.keys()), threshold=80)
        if fuzzy_results:
            best_match = fuzzy_results[0]
            matched_pages[slug] = existing[best_match[0]]
            print(f"  Fuzzy matched '{slug}' -> '{best_match[0]}' (score: {best_match[1]:.0f})")
            continue

    found = len(matched_pages)
    total = len(extracted_products)
    new_count = total - found
    print(f"  Wiki search: {found} existing pages found, {new_count} new products to create")

    return {"existing_pages": matched_pages}
