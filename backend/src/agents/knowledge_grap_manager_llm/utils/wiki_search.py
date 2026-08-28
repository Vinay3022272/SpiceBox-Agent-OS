"""
wiki_search.py — Search across existing wiki pages.

Uses rapidfuzz for fuzzy filename/title matching and simple text search
for content matching within pages.
"""

import os
from pathlib import Path
from rapidfuzz import fuzz, process


def fuzzy_match_slug(query: str, existing_slugs: list[str], threshold: int = 75) -> list[tuple[str, float]]:
    """
    Find slugs that fuzzy-match a query.
    Returns list of (slug, score) tuples above threshold, sorted by score desc.
    """
    if not existing_slugs:
        return []

    matches = process.extract(
        query.lower().replace(" ", "-"),
        existing_slugs,
        scorer=fuzz.ratio,
        limit=10,
    )

    return [(match[0], match[1]) for match in matches if match[1] >= threshold]


def search_page_content(wiki_dir: str, section: str, query: str) -> list[dict[str, str | float]]:
    """
    Search through wiki page contents for a query string.
    Returns list of dicts with slug, path, score, and matching excerpt.
    """
    results = []
    section_dir = Path(wiki_dir) / section

    if not section_dir.exists():
        return results

    query_lower = query.lower()

    for md_file in section_dir.rglob("*.md"):
        if md_file.name in ("index.md", "log.md"):
            continue

        try:
            content = md_file.read_text(encoding="utf-8")
            content_lower = content.lower()

            if query_lower in content_lower:
                # Find the matching line for context
                lines = content.split("\n")
                excerpt = ""
                for line in lines:
                    if query_lower in line.lower():
                        excerpt = line.strip()[:200]
                        break

                # Calculate relevance score
                score = fuzz.partial_ratio(query_lower, content_lower[:500])

                results.append({
                    "slug": md_file.stem,
                    "path": str(md_file),
                    "score": score,
                    "excerpt": excerpt,
                    "page_type": md_file.parent.name,
                })
        except Exception:
            continue

    results.sort(key=lambda x: x["score"], reverse=True)
    return results


def find_related_pages(
    wiki_dir: str,
    section: str,
    product_name: str,
    brand: str = "",
    category: str = "",
) -> dict[str, list[str]]:
    """
    Find pages related to a product by name, brand, and category.
    Returns dict with 'products', 'categories', 'reviews' keys.
    """
    related = {"products": [], "categories": [], "reviews": [], "insights": []}
    section_dir = Path(wiki_dir) / section

    if not section_dir.exists():
        return related

    for page_type in related.keys():
        type_dir = section_dir / page_type
        if not type_dir.exists():
            continue

        for md_file in type_dir.glob("*.md"):
            if md_file.name == "index.md":
                continue

            slug = md_file.stem
            content = ""
            try:
                content = md_file.read_text(encoding="utf-8")[:500].lower()
            except Exception:
                pass

            # Check if related
            name_match = fuzz.partial_ratio(product_name.lower(), slug) > 60
            brand_match = brand and brand.lower() in content
            category_match = category and category.lower() in content

            if name_match or brand_match or category_match:
                related[page_type].append(slug)

    return related
