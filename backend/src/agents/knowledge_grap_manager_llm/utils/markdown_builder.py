"""
markdown_builder.py — Helpers to construct structured markdown content.
"""

from datetime import datetime


def heading(text: str, level: int = 1) -> str:
    """Create a markdown heading."""
    return f"{'#' * level} {text}\n\n"


def section(title: str, content: str, level: int = 2) -> str:
    """Create a markdown section with heading and content."""
    return f"{'#' * level} {title}\n\n{content}\n\n"


def bullet_list(items: list[str]) -> str:
    """Create a markdown bullet list."""
    if not items:
        return "_None._\n"
    return "\n".join(f"- {item}" for item in items) + "\n"


def numbered_list(items: list[str]) -> str:
    """Create a markdown numbered list."""
    if not items:
        return "_None._\n"
    return "\n".join(f"{i+1}. {item}" for i, item in enumerate(items)) + "\n"


def table(headers: list[str], rows: list[list[str]]) -> str:
    """Create a markdown table."""
    if not rows:
        return ""
    header_row = "| " + " | ".join(headers) + " |"
    separator = "| " + " | ".join("---" for _ in headers) + " |"
    data_rows = "\n".join("| " + " | ".join(str(cell) for cell in row) + " |" for row in rows)
    return f"{header_row}\n{separator}\n{data_rows}\n"


def wiki_link(slug: str, display: str | None = None) -> str:
    """Create a standard Markdown relative link."""
    label = display if display else slug.split("/")[-1].replace("-", " ").title()
    rel_path = slug if slug.endswith(".md") else f"{slug}.md"
    if not rel_path.startswith("./") and not rel_path.startswith("../"):
        rel_path = f"./{rel_path}"
    return f"[{label}]({rel_path})"


def source_reference(source_file: str, detail: str = "") -> str:
    """Create a source reference."""
    if detail:
        return f"`{source_file}` — {detail}"
    return f"`{source_file}`"


def conflict_block(field: str, old_value: str, new_value: str, old_source: str, new_source: str) -> str:
    """Create a formatted contradiction/conflict block."""
    return (
        f"> **Data Conflict: {field}**\n"
        f"> \n"
        f"> Previous: `{old_value}` (Source: {old_source})\n"
        f"> New: `{new_value}` (Source: {new_source})\n"
        f"> \n"
        f"> Status: _Requires resolution_\n\n"
    )


def metadata_block(data: dict) -> str:
    """Create a YAML-style metadata block at the top of a page."""
    lines = ["---"]
    for key, value in data.items():
        if isinstance(value, list):
            lines.append(f"{key}:")
            for item in value:
                lines.append(f"  - {item}")
        else:
            lines.append(f"{key}: {value}")
    lines.append("---")
    return "\n".join(lines) + "\n\n"


def log_entry_block(
    operation: str,
    section: str,
    files: list[str],
    products_added: int = 0,
    products_updated: int = 0,
    reviews_processed: int = 0,
    pages_created: list[str] | None = None,
    pages_updated: list[str] | None = None,
    conflicts: int = 0,
    status: str = "SUCCESS",
    errors: list[str] | None = None,
) -> str:
    """Create a formatted log entry block."""
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    lines = [
        f"## [{timestamp}] {operation} | {section}",
        "",
        f"**Files processed:**",
    ]
    for f in files:
        lines.append(f"- `{f}`")

    lines.extend([
        "",
        f"**Products added:** {products_added}",
        f"**Products updated:** {products_updated}",
        f"**Reviews processed:** {reviews_processed}",
    ])

    if pages_created:
        lines.append("\n**Pages created:**")
        for p in pages_created:
            lines.append(f"- `{p}`")

    if pages_updated:
        lines.append("\n**Pages updated:**")
        for p in pages_updated:
            lines.append(f"- `{p}`")

    lines.extend([
        "",
        f"**Conflicts detected:** {conflicts}",
        f"**Status:** {status}",
    ])

    if errors:
        lines.append("\n**Errors:**")
        for e in errors:
            lines.append(f"- Error: {e}")

    lines.append("\n---\n")
    return "\n".join(lines)
