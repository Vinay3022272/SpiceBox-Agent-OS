"""
update_index — DETERMINISTIC NODE

Rebuilds index.md from all wiki pages.
Both section-level and master indexes.
"""

from pathlib import Path
from datetime import datetime

try:
    from ..state import WikiState
    from ..utils.file_io import write_markdown, list_wiki_pages, read_markdown
except (ImportError, ValueError):
    from src.agents.store_manager_llm.state import WikiState
    from src.agents.store_manager_llm.utils.file_io import write_markdown, list_wiki_pages, read_markdown


def _extract_title_from_md(content: str) -> str:
    """Extract the first H1 heading from markdown content."""
    for line in content.split("\n"):
        if line.startswith("# "):
            return line[2:].strip()
    return "Untitled"


def _extract_metadata_field(content: str, field: str) -> str:
    """Extract a field from YAML frontmatter."""
    in_frontmatter = False
    for line in content.split("\n"):
        if line.strip() == "---":
            if in_frontmatter:
                break
            in_frontmatter = True
            continue
        if in_frontmatter and line.startswith(f"{field}:"):
            return line.split(":", 1)[1].strip()
    return ""


def update_index(state: WikiState) -> dict:
    """
    Rebuild index.md files:
    1. Section-level index (knowledge/index.md or marketing/index.md)
    2. Master index (wiki/index.md)
    """
    wiki_base = state["wiki_base_path"]
    section = state.get("wiki_section", "knowledge")
    wiki_dir = f"{wiki_base}/wiki"

    # ── Section Index ────────────────────────────────────────────────────
    section_pages = list_wiki_pages(wiki_dir, section)

    # Group pages by type
    pages_by_type: dict[str, list[dict]] = {}
    for slug, path in section_pages.items():
        page_type = Path(path).parent.name
        content = read_markdown(path)
        title = _extract_title_from_md(content)

        if page_type not in pages_by_type:
            pages_by_type[page_type] = []
        pages_by_type[page_type].append({
            "slug": slug,
            "title": title,
            "path": path,
            "page_type": page_type,
        })

    # Build section index content
    if section == "knowledge":
        index_title = "Product Knowledge Index"
    else:
        index_title = "Marketing & Promotions Index"

    index_lines = [
        f"# {index_title}",
        "",
        f"_Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}_",
        "",
    ]

    type_display = {
        "products": "Products",
        "categories": "Categories",
        "reviews": "Reviews",
        "insights": "Insights",
        "promotions": "Promotions",
        "specialties": "Specialties",
        "popular": "Popular Items",
        "campaigns": "Campaigns",
    }

    for page_type in sorted(pages_by_type.keys()):
        pages = pages_by_type[page_type]
        display = type_display.get(page_type, page_type.title())
        index_lines.append(f"## {display}")
        index_lines.append("")

        for page in sorted(pages, key=lambda x: x["title"]):
            link = f"[{page['title']}](./{page_type}/{page['slug']}.md)"
            index_lines.append(f"- {link}")

        index_lines.append("")

    section_index_path = f"{wiki_dir}/{section}/index.md"
    write_markdown(section_index_path, "\n".join(index_lines))

    # ── Master Index ─────────────────────────────────────────────────────
    master_lines = [
        "# Merchant Knowledge Index",
        "",
        f"_Last updated: {datetime.now().strftime('%Y-%m-%d %H:%M')}_",
        "",
    ]

    for s in ["knowledge", "marketing"]:
        s_pages = list_wiki_pages(wiki_dir, s)
        if not s_pages:
            continue

        s_title = "Knowledge Base" if s == "knowledge" else "Marketing Intelligence"
        master_lines.append(f"## {s_title}")
        master_lines.append("")

        # Group by type
        s_by_type: dict[str, list] = {}
        for slug, path in s_pages.items():
            pt = Path(path).parent.name
            if pt not in s_by_type:
                s_by_type[pt] = []
            content = read_markdown(path)
            title = _extract_title_from_md(content)
            s_by_type[pt].append({"slug": slug, "title": title})

        for pt in sorted(s_by_type.keys()):
            display = type_display.get(pt, pt.title())
            master_lines.append(f"### {display}")
            master_lines.append("")
            for page in sorted(s_by_type[pt], key=lambda x: x["title"]):
                master_lines.append(f"- [{page['title']}](./{s}/{pt}/{page['slug']}.md)")
            master_lines.append("")

    master_index_path = f"{wiki_dir}/index.md"
    write_markdown(master_index_path, "\n".join(master_lines))

    total_pages = len(section_pages)
    print(f"  Index updated: {total_pages} pages in {section}")

    return {
        "index_updates": [{"section": section, "page_count": total_pages}],
    }
