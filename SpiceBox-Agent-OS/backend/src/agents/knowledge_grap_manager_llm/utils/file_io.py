"""
file_io.py — Filesystem operations for the merchant knowledge wiki.

Handles:
  - Creating the wiki directory structure
  - Reading/writing/appending markdown files
  - Copying raw sources (immutable)
  - Slugifying names for canonical IDs
"""

import os
import shutil
from pathlib import Path
from datetime import datetime
from slugify import slugify as _slugify


# ── Directory Structure ──────────────────────────────────────────────────────

WIKI_STRUCTURE = {
    "raw": {
        "knowledge": ["catalog", "reviews", "documents", "images"],
        "marketing": ["promotions", "specialties", "campaigns", "images"],
    },
    "wiki": {
        "knowledge": ["products", "categories", "reviews", "insights"],
        "marketing": ["promotions", "specialties", "popular", "campaigns"],
    },
}


def ensure_wiki_structure(base_path: str) -> dict[str, str]:
    """
    Creates the full merchant_knowledge/ directory tree.
    Returns a dict of key paths for quick access.
    """
    base = Path(base_path)
    paths = {"base": str(base)}

    # Create raw/ directories
    for section, subdirs in WIKI_STRUCTURE["raw"].items():
        for subdir in subdirs:
            p = base / "raw" / section / subdir
            p.mkdir(parents=True, exist_ok=True)
            paths[f"raw_{section}_{subdir}"] = str(p)

    # Create wiki/ directories
    for section, subdirs in WIKI_STRUCTURE["wiki"].items():
        section_path = base / "wiki" / section
        section_path.mkdir(parents=True, exist_ok=True)
        paths[f"wiki_{section}"] = str(section_path)

        for subdir in subdirs:
            p = section_path / subdir
            p.mkdir(parents=True, exist_ok=True)
            paths[f"wiki_{section}_{subdir}"] = str(p)

    # Create master index and log if they don't exist
    master_index = base / "wiki" / "index.md"
    if not master_index.exists():
        master_index.write_text("# Merchant Knowledge Index\n\n_Auto-generated. Do not edit manually._\n\n", encoding="utf-8")
    paths["master_index"] = str(master_index)

    log_file = base / "wiki" / "log.md"
    if not log_file.exists():
        log_file.write_text("# Knowledge Base Log\n\n_Chronological record of all operations._\n\n---\n\n", encoding="utf-8")
    paths["log"] = str(log_file)

    # Per-section indexes
    for section in ["knowledge", "marketing"]:
        section_index = base / "wiki" / section / "index.md"
        if not section_index.exists():
            title = "Product Knowledge Index" if section == "knowledge" else "Marketing & Promotions Index"
            section_index.write_text(f"# {title}\n\n_Auto-generated. Do not edit manually._\n\n", encoding="utf-8")
        paths[f"{section}_index"] = str(section_index)

    return paths


# ── File Operations ──────────────────────────────────────────────────────────

def read_markdown(path: str) -> str:
    """Read a markdown file. Returns empty string if file doesn't exist."""
    p = Path(path)
    if p.exists():
        return p.read_text(encoding="utf-8")
    return ""


def write_markdown(path: str, content: str) -> None:
    """Write content to a markdown file, creating parent dirs if needed."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(content, encoding="utf-8")


def append_markdown(path: str, content: str) -> None:
    """Append content to a markdown file."""
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    with open(p, "a", encoding="utf-8") as f:
        f.write(content)


def list_files(directory: str, extensions: list[str] | None = None) -> list[dict[str, str | int]]:
    """
    List all files in a directory (non-recursive by default).
    Returns list of dicts with path, filename, extension, size_bytes.
    """
    result = []
    d = Path(directory)
    if not d.exists():
        return result

    for item in d.rglob("*"):
        if item.is_file():
            ext = item.suffix.lower()
            if extensions and ext not in extensions:
                continue
            result.append({
                "path": str(item),
                "filename": item.name,
                "extension": ext,
                "size_bytes": item.stat().st_size,
            })
    return result


def copy_to_raw(src_path: str, raw_base: str, category: str) -> str:
    """
    Copy a source file into the raw/ directory (immutable storage).
    Adds a timestamp prefix to prevent collisions.
    Returns the destination path.
    """
    src = Path(src_path)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    dest_dir = Path(raw_base) / category
    dest_dir.mkdir(parents=True, exist_ok=True)

    dest_name = f"{timestamp}_{src.name}"
    dest = dest_dir / dest_name
    shutil.copy2(str(src), str(dest))
    return str(dest)


def list_wiki_pages(wiki_dir: str, section: str) -> dict[str, str]:
    """
    List all .md pages in a wiki section.
    Returns dict of slug -> file_path.
    """
    pages = {}
    section_dir = Path(wiki_dir) / section
    if not section_dir.exists():
        return pages

    for md_file in section_dir.rglob("*.md"):
        if md_file.name in ("index.md", "log.md"):
            continue
        slug = md_file.stem
        pages[slug] = str(md_file)
    return pages


# ── Slugify ──────────────────────────────────────────────────────────────────

def slugify(name: str) -> str:
    """
    Create a canonical slug for filenames.
    "iPhone 15 Pro Max" → "iphone-15-pro-max"
    """
    return _slugify(name, lowercase=True)


# ── Page Path Helpers ────────────────────────────────────────────────────────

def get_page_path(wiki_base: str, section: str, page_type: str, slug: str) -> str:
    """Get the full file path for a wiki page."""
    return str(Path(wiki_base) / "wiki" / section / page_type / f"{slug}.md")


def page_exists(wiki_base: str, section: str, page_type: str, slug: str) -> bool:
    """Check if a wiki page already exists."""
    return Path(get_page_path(wiki_base, section, page_type, slug)).exists()
