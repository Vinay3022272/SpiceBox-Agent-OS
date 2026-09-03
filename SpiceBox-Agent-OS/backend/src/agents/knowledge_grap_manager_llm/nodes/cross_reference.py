import os
import re
from pathlib import Path
from typing import Any

from ..state import WikiState
from ..utils.file_io import read_markdown, write_markdown, list_wiki_pages, slugify


def _update_related_section(content: str, links: list[str]) -> str:
    """
    Replace or inject the ## Related section with the provided markdown links.
    Preserves all preceding content and following sections (like ## Sources).
    """
    if not links:
        return content

    links_text = "\n".join(f"- {link}" for link in links)
    related_block = f"## Related\n\n{links_text}\n"

    # If ## Related heading already exists (even if empty)
    if "## Related" in content:
        parts = re.split(r"(?:^|\n)## Related\b", content, maxsplit=1)
        if len(parts) == 2:
            before = parts[0].rstrip()
            after_match = re.search(r"\n(?=## )", parts[1])
            if after_match:
                after = parts[1][after_match.start():].lstrip()
                return f"{before}\n\n{related_block}\n{after}"
            else:
                return f"{before}\n\n{related_block}"

    # If ## Sources exists, insert before it
    if "## Sources" in content:
        return content.replace("## Sources", f"{related_block}\n## Sources")

    # Otherwise append at the end
    return f"{content.rstrip()}\n\n{related_block}"


def _parse_frontmatter(content: str) -> dict[str, str]:
    """Extract basic YAML frontmatter keys from markdown text."""
    data: dict[str, str] = {}
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            for line in parts[1].strip().splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    data[k.strip().lower()] = v.strip()
    return data


def cross_reference(state: WikiState) -> dict:
    """
    Add bidirectional cross-references (wiki-links) between related pages.
    Populates the '## Related' section with:
      1. Category dossier link (e.g. [Smartwatches](../categories/smartwatches.md))
      2. Peer alternative products in the same category (e.g. [Apex Pulse 2](./apex-pulse-2.md) (Alternative))
      3. Brand complementary items (e.g. accessories from the same brand)
      4. Cross-section Marketing Intelligence links (popular/promotions dossiers)
    """
    wiki_base = state.get("wiki_base_path", "")
    section = state.get("wiki_section", "knowledge")
    extracted_products = state.get("extracted_products", [])

    wiki_dir = Path(wiki_base) / "wiki"
    if not wiki_dir.exists():
        return {}

    # 1. Discover all existing pages across knowledge and marketing sections
    try:
        knowledge_pages = list_wiki_pages(str(wiki_dir), "knowledge")
        marketing_pages = list_wiki_pages(str(wiki_dir), "marketing")
    except Exception as e:
        print(f"  [cross_reference] Error reading wiki pages: {e}")
        knowledge_pages, marketing_pages = {}, {}

    # Build lookup dictionaries
    products_by_slug: dict[str, dict[str, Any]] = {}
    products_by_category: dict[str, list[dict[str, Any]]] = {}
    products_by_brand: dict[str, list[dict[str, Any]]] = {}

    # Seed from extracted_products in state
    for p in extracted_products:
        slug = p.get("slug")
        if not slug:
            continue
        products_by_slug[slug] = p
        cat = p.get("category", "")
        if cat:
            products_by_category.setdefault(cat, []).append(p)
        brand = p.get("brand", "")
        if brand and brand.lower() not in ("unknown", "spicebox"):
            products_by_brand.setdefault(brand, []).append(p)

    # Supplement by reading frontmatter of all existing product markdown files
    prod_dir = wiki_dir / "knowledge" / "products"
    if prod_dir.exists():
        for p_file in prod_dir.glob("*.md"):
            slug = p_file.stem
            if slug not in products_by_slug:
                try:
                    f_content = p_file.read_text(encoding="utf-8")
                    meta = _parse_frontmatter(f_content)
                    cat = meta.get("category", "")
                    name = meta.get("name", slug.replace("-", " ").title())
                    brand = meta.get("brand", "")

                    prod_item = {"slug": slug, "name": name, "category": cat, "brand": brand}
                    products_by_slug[slug] = prod_item
                    if cat:
                        products_by_category.setdefault(cat, []).append(prod_item)
                    if brand and brand.lower() not in ("unknown", "spicebox"):
                        products_by_brand.setdefault(brand, []).append(prod_item)
                except Exception:
                    pass

    # 2. Determine target files to cross-reference
    target_pages = []
    generated_pages = state.get("generated_pages", [])
    seen_paths = set()

    if generated_pages:
        for gp in generated_pages:
            fp = gp.get("file_path")
            if fp and fp not in seen_paths:
                target_pages.append(gp)
                seen_paths.add(fp)

    # If target_pages is empty, process all existing pages in the active section
    if not target_pages:
        if section == "knowledge":
            for slug, path in knowledge_pages.items():
                if "/products/" in path:
                    target_pages.append({"slug": slug, "file_path": path, "page_type": "products"})
        elif section == "marketing":
            for slug, path in marketing_pages.items():
                target_pages.append({"slug": slug, "file_path": path, "page_type": "popular"})

    if not target_pages:
        return {}

    linked_count = 0

    # 3. Process each target page
    for page in target_pages:
        slug = page.get("slug")
        file_path = page.get("file_path")
        if not slug or not file_path or not os.path.exists(file_path):
            continue

        try:
            content = read_markdown(file_path)
        except Exception as e:
            print(f"  [cross_reference] Could not read '{file_path}': {e}")
            continue

        if not content.strip():
            continue

        meta = _parse_frontmatter(content)
        product = products_by_slug.get(slug, {})

        name = meta.get("name") or product.get("name") or slug.replace("-", " ").title()
        category = meta.get("category") or product.get("category") or ""
        brand = meta.get("brand") or product.get("brand") or ""
        file_dir = os.path.dirname(file_path)

        related_links: list[str] = []

        # ── Handle Knowledge Product Pages ─────────────────────────────
        if "/knowledge/products/" in file_path or page.get("page_type") == "products":
            # (A) Category link
            if category:
                cat_slug = slugify(category)
                cat_file = wiki_dir / "knowledge" / "categories" / f"{cat_slug}.md"
                if cat_file.exists():
                    rel_path = os.path.relpath(cat_file, start=file_dir).replace("\\", "/")
                    related_links.append(f"[{category}]({rel_path}) (Category)")

            # (B) Alternative peer products in same category (up to 4 items)
            if category and category in products_by_category:
                peers = [p for p in products_by_category[category] if p.get("slug") != slug]
                for peer in peers[:4]:
                    peer_slug = peer.get("slug")
                    peer_name = peer.get("name", peer_slug.replace("-", " ").title())
                    related_links.append(f"[{peer_name}](./{peer_slug}.md) (Alternative)")

            # (C) Complementary items from same brand (different category, up to 2 items)
            if brand and brand in products_by_brand:
                comps = [
                    p for p in products_by_brand[brand]
                    if p.get("slug") != slug and p.get("category") != category
                ]
                for comp in comps[:2]:
                    comp_slug = comp.get("slug")
                    comp_name = comp.get("name", comp_slug.replace("-", " ").title())
                    related_links.append(f"[{comp_name}](./{comp_slug}.md) (Complementary)")

            # (D) Marketing dossier link if available
            pop_file = wiki_dir / "marketing" / "popular" / f"{slug}.md"
            if pop_file.exists():
                rel_pop = os.path.relpath(pop_file, start=file_dir).replace("\\", "/")
                related_links.append(f"[{name} — Popular Item Intelligence]({rel_pop}) (Market Intelligence)")

            promo_file = wiki_dir / "marketing" / "promotions" / f"{slug}.md"
            if promo_file.exists():
                rel_promo = os.path.relpath(promo_file, start=file_dir).replace("\\", "/")
                related_links.append(f"[{name} — Active Promotion]({rel_promo}) (Promotion)")

        # ── Handle Marketing Pages ─────────────────────────────────────
        elif "/marketing/" in file_path:
            # (A) Link to Primary Product Dossier in Knowledge section
            prod_file = wiki_dir / "knowledge" / "products" / f"{slug}.md"
            if prod_file.exists():
                rel_prod = os.path.relpath(prod_file, start=file_dir).replace("\\", "/")
                related_links.append(f"[{name}]({rel_prod}) (Primary Product Dossier)")

            # (B) Category dossier link
            if category:
                cat_slug = slugify(category)
                cat_file = wiki_dir / "knowledge" / "categories" / f"{cat_slug}.md"
                if cat_file.exists():
                    rel_cat = os.path.relpath(cat_file, start=file_dir).replace("\\", "/")
                    related_links.append(f"[{category}]({rel_cat}) (Category)")

            # (C) Alternative popular / competitor items in same category
            if category and category in products_by_category:
                peers = [p for p in products_by_category[category] if p.get("slug") != slug]
                for peer in peers[:3]:
                    peer_slug = peer.get("slug")
                    peer_pop = wiki_dir / "marketing" / "popular" / f"{peer_slug}.md"
                    peer_prod = wiki_dir / "knowledge" / "products" / f"{peer_slug}.md"
                    target_file = peer_pop if peer_pop.exists() else peer_prod
                    if target_file.exists():
                        rel_peer = os.path.relpath(target_file, start=file_dir).replace("\\", "/")
                        peer_name = peer.get("name", peer_slug.replace("-", " ").title())
                        related_links.append(f"[{peer_name}]({rel_peer}) (Alternative Option)")

        # Apply updated related links to file
        if related_links:
            new_content = _update_related_section(content, related_links)
            if new_content != content:
                write_markdown(file_path, new_content)
                linked_count += 1

    print(f"✔ Cross-referencing complete: updated {linked_count} pages with relational links")
    return {}
