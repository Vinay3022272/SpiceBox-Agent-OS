"""
cross_reference — LLM NODE

Adds wiki-links between related pages:
  - Products ↔ Categories
  - Products ↔ Related/competing products
  - Knowledge products ↔ Marketing promotions
  - Products ↔ Review syntheses
"""

import re
import os
from pathlib import Path
try:
    from ..state import WikiState
    from ..utils.file_io import read_markdown, write_markdown, list_wiki_pages
    from ..utils.llm import call_llm_json
except (ImportError, ValueError):
    from src.agents.store_manager_llm.state import WikiState
    from src.agents.store_manager_llm.utils.file_io import read_markdown, write_markdown, list_wiki_pages
    from src.agents.store_manager_llm.utils.llm import call_llm_json


def cross_reference(state: WikiState) -> dict:
    """
    Add cross-references (wiki-links) between related pages.
    """
    wiki_base = state["wiki_base_path"]
    section = state.get("wiki_section", "knowledge")
    generated_pages = state.get("generated_pages", [])
    extracted_products = state.get("extracted_products", [])

    if not generated_pages:
        return {}

    wiki_dir = f"{wiki_base}/wiki"

    # Get all existing pages in both sections
    knowledge_pages = list_wiki_pages(wiki_dir, "knowledge")
    marketing_pages = list_wiki_pages(wiki_dir, "marketing")

    # Build a context of all available pages
    all_pages = {}
    for slug, path in knowledge_pages.items():
        rel_path = str(Path(path).relative_to(Path(wiki_dir)))
        all_pages[slug] = {"path": path, "rel": rel_path, "section": "knowledge"}
    for slug, path in marketing_pages.items():
        rel_path = str(Path(path).relative_to(Path(wiki_dir)))
        all_pages[slug] = {"path": path, "rel": rel_path, "section": "marketing"}

    if not all_pages:
        return {}

    # Build product info for LLM context
    product_map = {p["slug"]: p for p in extracted_products}

    available_pages = "\n".join(f"- {slug} ({info['section']}/{info['rel']})" for slug, info in all_pages.items())

    for page in generated_pages:
        slug = page["slug"]
        file_path = page["file_path"]
        content = read_markdown(file_path)

        if not content:
            continue

        product = product_map.get(slug, {})

        prompt = (
            f"Given this wiki page and the list of all available pages, "
            f"identify which pages should be cross-linked.\n\n"
            f"CURRENT PAGE: {slug}\n"
            f"Category: {product.get('category', 'unknown')}\n"
            f"Brand: {product.get('brand', 'unknown')}\n\n"
            f"AVAILABLE PAGES:\n{available_pages}\n\n"
            f"Return JSON: {{\n"
            f"  \"related_pages\": [\n"
            f"    {{\"slug\": \"...\", \"relationship\": \"category/competitor/related/promotion\"}}\n"
            f"  ]\n"
            f"}}"
        )

        try:
            result = call_llm_json(prompt, system="You are a knowledge graph curator.")
            related = result.get("related_pages", [])

            if related:
                # Add a Related section if not present
                if "## Related" not in content:
                    links_md = "\n## Related\n\n"
                    for rel in related:
                        rel_slug = rel.get("slug", "")
                        relationship = rel.get("relationship", "related")
                        if rel_slug in all_pages:
                            rel_info = all_pages[rel_slug]
                            rel_link_path = os.path.relpath(rel_info['path'], start=os.path.dirname(file_path)).replace("\\", "/")
                            display_title = rel_slug.replace("-", " ").title()
                            links_md += f"- [{display_title}]({rel_link_path}) ({relationship})\n"

                    content += links_md
                    write_markdown(file_path, content)
                    print(f" Cross-linked: {slug} -> {len(related)} pages")

        except Exception as e:
            print(f" Error cross-referencing {slug}: {e}")

    print(f" Cross-referencing complete")
    return {}
