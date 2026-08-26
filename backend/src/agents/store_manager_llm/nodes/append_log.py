"""
append_log — DETERMINISTIC NODE

Appends a timestamped operation record to log.md.
Never overwrites — always appends.
"""

from datetime import datetime

try:
    from ..state import WikiState, LogEntry
    from ..utils.file_io import append_markdown
    from ..utils.markdown_builder import log_entry_block
except (ImportError, ValueError):
    from src.agents.store_manager_llm.state import WikiState, LogEntry
    from src.agents.store_manager_llm.utils.file_io import append_markdown
    from src.agents.store_manager_llm.utils.markdown_builder import log_entry_block


def append_log(state: WikiState) -> dict:
    """
    Append an operation record to wiki/log.md.
    """
    wiki_base = state["wiki_base_path"]
    section = state.get("wiki_section", "knowledge")
    uploaded_files = state.get("uploaded_files", [])
    pages_to_create = state.get("pages_to_create", [])
    pages_to_update = state.get("pages_to_update", [])
    generated_pages = state.get("generated_pages", [])
    contradictions = state.get("contradictions", [])
    extracted_reviews = state.get("extracted_reviews", [])
    validation_errors = state.get("validation_errors", [])

    # Build log entry
    files_processed = [f["filename"] for f in uploaded_files]
    pages_created = [f"{p['page_type']}/{p['slug']}.md" for p in pages_to_create]
    pages_updated = [f"{p['page_type']}/{p['slug']}.md" for p in pages_to_update]

    status = "SUCCESS"
    if validation_errors:
        status = "PARTIAL"
    if state.get("status") == "failed":
        status = "FAILED"

    log_block = log_entry_block(
        operation="ingest",
        section=section,
        files=files_processed,
        products_added=len(pages_to_create),
        products_updated=len(pages_to_update),
        reviews_processed=len(extracted_reviews),
        pages_created=pages_created,
        pages_updated=pages_updated,
        conflicts=len(contradictions),
        status=status,
        errors=validation_errors,
    )

    log_path = f"{wiki_base}/wiki/log.md"
    append_markdown(log_path, log_block)

    # Build the LogEntry for state
    log_entry = LogEntry(
        timestamp=datetime.now().isoformat(),
        operation="ingest",
        section=section,
        files_processed=files_processed,
        products_added=len(pages_to_create),
        products_updated=len(pages_to_update),
        reviews_processed=len(extracted_reviews),
        pages_created=pages_created,
        pages_updated=pages_updated,
        conflicts=len(contradictions),
        status=status,
        errors=validation_errors or [],
    )

    print(f" Log appended: {status}")
    return {"log_entry": log_entry}
