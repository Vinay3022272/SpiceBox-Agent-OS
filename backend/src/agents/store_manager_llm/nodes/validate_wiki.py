"""
validate_wiki — LLM + DETERMINISTIC NODE

Performs wiki health checks (lint):
  - Orphan pages (not in any index)
  - Duplicate products
  - Missing reviews
  - Conflicting specs
  - Broken cross-links
"""

import os
import re
from pathlib import Path
from collections import Counter

try:
    from ..state import WikiState, ValidationResult
    from ..utils.file_io import list_wiki_pages, read_markdown
except (ImportError, ValueError):
    from src.agents.store_manager_llm.state import WikiState, ValidationResult
    from src.agents.store_manager_llm.utils.file_io import list_wiki_pages, read_markdown


def validate_wiki(state: WikiState) -> dict:
    """
    Validate the wiki for health issues.
    Returns a ValidationResult with health score.
    """
    wiki_base = state["wiki_base_path"]
    wiki_dir = f"{wiki_base}/wiki"
    errors: list[str] = []

    orphan_pages: list[str] = []
    duplicate_products: list[str] = []
    missing_reviews: list[str] = []
    conflicting_specs: list[str] = []
    broken_links: list[str] = []
    outdated_prices: list[str] = []

    # Check both sections
    for section in ["knowledge", "marketing"]:
        pages = list_wiki_pages(wiki_dir, section)

        # Read the index
        index_path = f"{wiki_dir}/{section}/index.md"
        index_content = read_markdown(index_path)

        # ── Check for orphan pages ──────────────────────────────────────
        for slug, path in pages.items():
            if slug not in index_content:
                orphan_pages.append(f"{section}/{slug}")

        # ── Check for duplicate product names ───────────────────────────
        if section == "knowledge":
            product_pages = {s: p for s, p in pages.items() if "products" in p}
            titles = []
            for slug, path in product_pages.items():
                content = read_markdown(path)
                for line in content.split("\n"):
                    if line.startswith("# "):
                        titles.append(line[2:].strip().lower())
                        break

            title_counts = Counter(titles)
            for title, count in title_counts.items():
                if count > 1:
                    duplicate_products.append(f"{title} (appears {count} times)")

        # ── Check for products missing reviews ──────────────────────────
        if section == "knowledge":
            product_slugs = {s for s, p in pages.items() if "products" in p}
            review_slugs = {s for s, p in pages.items() if "reviews" in p}

            for slug in product_slugs:
                content = read_markdown(pages[slug])
                if "Customer Sentiment" in content:
                    # Check if it actually has review data
                    if "No review data available" in content:
                        missing_reviews.append(slug)
                elif "review" not in content.lower() and "rating" not in content.lower():
                    missing_reviews.append(slug)

        # ── Check for broken links (Standard Markdown & double brackets) ──
        for slug, path in pages.items():
            content = read_markdown(path)

            # Check standard markdown links [label](target.md)
            standard_links = re.findall(r'\[([^\]]+)\]\(([^)]+)\)', content)
            for label, link in standard_links:
                if link.startswith("http") or link.startswith("#"):
                    continue
                # Resolve relative path
                page_dir = os.path.dirname(path)
                target_path = os.path.abspath(os.path.join(page_dir, link))
                if not os.path.exists(target_path):
                    broken_links.append(f"{slug} -> {link}")

            # Check double bracket links [[...]]
            bracket_links = re.findall(r'\[\[([^\]]+)\]\]', content)
            for link in bracket_links:
                link_slug = link.split("|")[0].strip()
                link_parts = link_slug.replace("\\", "/").split("/")
                target_slug = link_parts[-1] if link_parts else link_slug

                all_pages = {}
                all_pages.update(list_wiki_pages(wiki_dir, "knowledge"))
                all_pages.update(list_wiki_pages(wiki_dir, "marketing"))

                if target_slug not in all_pages and target_slug not in pages:
                    broken_links.append(f"{slug} -> {link_slug}")

        # ── Check for conflict markers ──────────────────────────────────
        for slug, path in pages.items():
            content = read_markdown(path)
            if "Data Conflict" in content:
                conflicting_specs.append(slug)

    # ── Calculate health score ──────────────────────────────────────────
    total_issues = (
        len(orphan_pages) +
        len(duplicate_products) +
        len(missing_reviews) +
        len(broken_links) +
        len(conflicting_specs)
    )

    all_pages = list_wiki_pages(wiki_dir, "knowledge")
    all_pages.update(list_wiki_pages(wiki_dir, "marketing"))
    total_pages = max(len(all_pages), 1)

    health_score = max(0.0, 1.0 - (total_issues / (total_pages * 3)))

    # Print health report (without emojis)
    print(f"\n  ---- Wiki Health Report ----")
    print(f"  Orphan pages: {len(orphan_pages)}")
    print(f"  Duplicate products: {len(duplicate_products)}")
    print(f"  Conflicting specs: {len(conflicting_specs)}")
    print(f"  Missing reviews: {len(missing_reviews)}")
    print(f"  Broken links: {len(broken_links)}")
    print(f"  Health score: {health_score:.0%}")
    print(f"  ----------------------------\n")

    result = ValidationResult(
        orphan_pages=orphan_pages,
        duplicate_products=duplicate_products,
        missing_reviews=missing_reviews,
        conflicting_specs=conflicting_specs,
        outdated_prices=outdated_prices,
        broken_links=broken_links,
        health_score=health_score,
    )

    return {
        "validation_result": result,
        "validation_errors": orphan_pages + duplicate_products + broken_links,
        "status": "success",
    }
