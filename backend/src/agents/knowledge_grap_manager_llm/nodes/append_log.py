from datetime import datetime

from ..state import WikiState, LogEntry
from ..utils.file_io import append_markdown
from ..utils.markdown_builder import log_entry_block


def append_log(state: WikiState) -> dict:
    """
    Append an operation record to wiki/log.md.
    """
    wiki_base = state.get("wiki_base_path", "")
    section = state.get("wiki_section", "knowledge")
    collected_data = state.get("collected_data", [])
    pages_to_create = state.get("pages_to_create", [])
    pages_to_update = state.get("pages_to_update", [])
    contradictions = state.get("contradictions", [])
    extracted_reviews = state.get("extracted_reviews", [])
    validation_errors = state.get("validation_errors", [])

    # Format DB record identifiers for log trace
    sources_processed = [
        f"db_record_{idx + 1} ({item.get('category', 'data')})"
        for idx, item in enumerate(collected_data)
    ]

    pages_created = [f"{p.get('page_type', 'products')}/{p.get('slug', '')}.md" for p in pages_to_create if "slug" in p]
    pages_updated = [f"{p.get('page_type', 'products')}/{p.get('slug', '')}.md" for p in pages_to_update if "slug" in p]

    status = "SUCCESS"
    if validation_errors:
        status = "PARTIAL"
    if state.get("status") == "failed":
        status = "FAILED"

    log_block = log_entry_block(
        operation="ingest",
        section=section,
        files=sources_processed,
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
    try:
        append_markdown(log_path, log_block)
    except Exception as e:
        print(f"  Error appending to log file '{log_path}': {e}")

    # Build the LogEntry object for state
    log_entry: LogEntry = {
        "timestamp": datetime.now().isoformat(),
        "operation": "ingest",
        "section": section,
        "files_processed": sources_processed,
        "products_added": len(pages_to_create),
        "products_updated": len(pages_to_update),
        "reviews_processed": len(extracted_reviews),
        "pages_created": pages_created,
        "pages_updated": pages_updated,
        "conflicts": len(contradictions),
        "status": status,
        "errors": validation_errors or [],
    }

    print(f"  Log appended: status={status}")
    return {"log_entry": log_entry}
