"""
classify_sources — LLM NODE

Uses the LLM to classify each uploaded file:
  - catalog (product listings)
  - review (customer reviews)
  - document (specs, manuals, etc.)
  - promotion (marketing/promotional content)
  - specialty (merchant specialty items)
  - image
"""

from ..state import WikiState
from ..utils.llm import call_llm_json
from ..utils.csv_reader import get_csv_summary, detect_csv_type
from ..utils.pdf_reader import extract_text_from_pdf


def classify_sources(state: WikiState) -> dict:
    """
    Classify each uploaded file into a category.
    Uses heuristics first, then LLM for ambiguous cases.
    """
    uploaded_files = state.get("uploaded_files", [])
    section = state.get("wiki_section", "knowledge")

    if not uploaded_files:
        return {"classified_sources": {}}

    classified: dict[str, list] = {}

    for file_info in uploaded_files:
        ext = file_info["extension"]
        filepath = file_info["path"]
        category = file_info["category"]

        # For CSVs, try heuristic detection first
        if ext in (".csv", ".xlsx", ".xls"):
            detected = detect_csv_type(filepath)
            if detected != "unknown":
                category = detected
            else:
                # Use LLM to classify
                summary = get_csv_summary(filepath)
                prompt = (
                    f"Classify this CSV file based on its columns and sample data.\n\n"
                    f"Columns: {summary.get('columns', [])}\n"
                    f"Sample rows: {summary.get('sample_rows', [])}\n\n"
                    f"Classify as one of: catalog, review, promotion, specialty, unknown\n\n"
                    f"Return JSON: {{\"category\": \"...\", \"reason\": \"...\"}}"
                )
                try:
                    result = call_llm_json(prompt, system="You are a data classifier.")
                    category = result.get("category", "catalog")
                except Exception:
                    category = "catalog"

        elif ext == ".pdf":
            # Extract first page and classify
            try:
                pages = extract_text_from_pdf(filepath)
                if pages:
                    first_page_text = pages[:500]
                    prompt = (
                        f"Classify this PDF document based on its first page content:\n\n"
                        f"{first_page_text}\n\n"
                        f"Classify as one of: catalog, document, promotion, specialty\n\n"
                        f"Return JSON: {{\"category\": \"...\", \"reason\": \"...\"}}"
                    )
                    try:
                        result = call_llm_json(prompt, system="You are a document classifier.")
                        category = result.get("category", "documents")
                    except Exception:
                        category = "documents"
            except Exception:
                category = "documents"

        # Update the file's category
        file_info_updated = dict(file_info)
        file_info_updated["category"] = category

        if category not in classified:
            classified[category] = []
        classified[category].append(file_info_updated)

    total = sum(len(v) for v in classified.values())
    categories_summary = ", ".join(f"{k}: {len(v)}" for k, v in classified.items())
    print(f" Classified {total} files → {categories_summary}")

    return {"classified_sources": classified}
