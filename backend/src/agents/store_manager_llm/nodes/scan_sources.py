"""
scan_sources — DETERMINISTIC NODE

Walks the source directory, identifies all files with metadata.
Copies them into raw/ (immutable) if not already there.
"""

import os
from pathlib import Path
from datetime import datetime

from ..state import WikiState, SourceFile
from ..utils.file_io import copy_to_raw, list_files


def scan_sources(state: WikiState) -> dict:
    """
    Scan the source directory for all uploadable files.
    Copy each file into raw/{section}/ as immutable source.
    """
    source_dir = state["source_dir"]
    wiki_base = state["wiki_base_path"]
    section = state.get("wiki_section", "knowledge")

    if not os.path.exists(source_dir):
        return {
            "uploaded_files": [],
            "status": "failed",
            "error": f"Source directory not found: {source_dir}",
        }

    # Supported extensions
    supported = [".csv", ".xlsx", ".xls", ".pdf", ".txt", ".json", ".md"]

    # Find all files
    raw_files = list_files(source_dir, extensions=supported)

    uploaded: list[SourceFile] = []

    for file_info in raw_files:
        filepath = file_info["path"]
        ext = file_info["extension"]

        # Determine raw category based on extension
        if ext in (".csv", ".xlsx", ".xls"):
            category = "catalog"  # Will be reclassified by classify_sources
        elif ext == ".pdf":
            category = "documents"
        elif ext in (".txt", ".json", ".md"):
            category = "documents"
        else:
            category = "documents"

        # Copy to raw/ (immutable)
        raw_dest = copy_to_raw(
            filepath,
            os.path.join(wiki_base, "raw", section),
            category,
        )

        uploaded.append(SourceFile(
            path=raw_dest,
            filename=file_info["filename"],
            extension=ext,
            size_bytes=file_info["size_bytes"],
            category=category,
        ))

    print(f" Scanned {len(uploaded)} files from {source_dir}")
    return {
        "uploaded_files": uploaded,
        "status": "running",
    }
