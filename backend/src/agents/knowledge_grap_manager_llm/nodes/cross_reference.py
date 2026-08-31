import re
import os
from pathlib import Path

from ..state import WikiState
from ..utils.file_io import read_markdown, write_markdown, list_wiki_pages
from ..utils.llm import call_llm_json


def cross_reference(state: WikiState) -> dict:
    """
    Add cross-references (wiki-links) between related pages.
    """
    wiki_base = state.get("wiki_base_path", "")
    section = state.get("wiki_section", "knowledge")
    generated_pages = state.get("generated_pages", [])
    extracted_products = state.get("extracted_products", [])

    if not generated_pages:
        return {}

    wiki_dir = f"{wiki_base}/wiki"

    # Get all existing pages across sections
    try:
        knowledge_pages = list_wiki_pages(wiki_dir, "knowledge")
        marketing_pages = list_wiki_pages(wiki_dir, "marketing")
    except Exception as e:
        print(f"  Error reading wiki pages for cross-referencing: {e}")
        knowledge_pages, marketing_pages = {}, {}

    # Build context of available pages
    all_pages = {}
    wiki_path_obj = Path(wiki_dir)

    for slug, path in knowledge_pages.items():
        try:
            rel_path = str(Path(path).relative_to(wiki_path_obj))
        except Exception:
            rel_path = path
        all_pages[slug] = {"path": path, "rel": rel_path, "section": "knowledge"}

    for slug, path in marketing_pages.items():
        try:
            rel_path = str(Path(path).relative_to(wiki_path_obj))
        except Exception:
            rel_path = path
        all_pages[slug] = {"path": path, "rel": rel_path, "section": "marketing"}

    if not all_pages:
        return {}

    product_map = {p.get("slug"): p for p in extracted_products if "slug" in p}
    available_pages_text = "\n".join(f"- {slug} ({info['section']}/{info['rel']})" for slug, info in all_pages.items())

    for page in generated_pages:
        slug = page.get("slug")
        file_path = page.get("file_path")

        if not slug or not file_path:
            continue

        try:
            content = read_markdown(file_path)
        except Exception as e:
            print(f"  Error reading file for cross-referencing '{file_path}': {e}")
            content = ""

        if not content.strip():
            continue

        product = product_map.get(slug, {})

        prompt = (
            f"Given this wiki page and the list of all available pages, "
            f"identify which pages should be cross-linked.\n\n"
            f"CURRENT PAGE: {slug}\n"
            f"Category: {product.get('category', 'unknown')}\n"
            f"Brand: {product.get('brand', 'unknown')}\n\n"
            f"AVAILABLE PAGES:\n{available_pages_text[:3000]}\n\n"
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
                # Add a ## Related section if not already present
                if "## Related" not in content:
                    links_md = "\n## Related\n\n"
                    for rel in related:
                        rel_slug = rel.get("slug", "")
                        relationship = rel.get("relationship", "related")
                        if rel_slug in all_pages and rel_slug != slug:
                            rel_info = all_pages[rel_slug]
                            try:
                                rel_link_path = os.path.relpath(rel_info['path'], start=os.path.dirname(file_path)).replace("\\", "/")
                            except Exception:
                                rel_link_path = rel_info['path']
                            display_title = rel_slug.replace("-", " ").title()
                            links_md += f"- [{display_title}]({rel_link_path}) ({relationship})\n"

                    content += links_md
                    write_markdown(file_path, content)
                    print(f"  Cross-linked: '{slug}' -> {len(related)} related pages")

        except Exception as e:
            print(f"  Error cross-referencing '{slug}': {e}")

    print("  Cross-referencing complete.")
    return {}
