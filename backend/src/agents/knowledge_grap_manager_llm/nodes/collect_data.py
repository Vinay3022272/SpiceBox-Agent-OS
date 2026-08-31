from typing import Any
from ..state import WikiState, DBSource


def fetch_db_data(merchant_id: str, section: str) -> list[dict[str, Any]]:
    """
    Database call that fetches N (e.g. 25) raw data rows for a merchant.
    Each row contains the payload data along with its category field 
    (e.g., 'catalog', 'review', 'document', 'promotion').
    """
    # Example SQL / ORM Query:
    # SELECT * FROM merchant_records WHERE merchant_id = :merchant_id AND section = :section
    return []


def collect_data(state: WikiState) -> dict:
    """
    Collects datasets from the DB call (category + CSV data), 
    and directly builds `classified_sources` mapped by category.
    """
    merchant_id = state.get("merchant_id")
    section = state.get("wiki_section", "knowledge")
    if not merchant_id:
        return {
            "collected_data": [],
            "classified_sources": {},
            "status": "failed",
            "error": "Merchant ID is missing from state.",
        }

    # If collected_data was already provided in initial state, use it; otherwise fetch from DB
    existing_data = state.get("collected_data")
    if existing_data:
        db_records = existing_data
    else:
        try:
            # Fetch category (str) and CSV data directly from DB call
            db_records = fetch_db_data(merchant_id=merchant_id, section=section)
        except Exception as e:
            return {
                "collected_data": [],
                "classified_sources": {},
                "status": "failed",
                "error": f"Database call failed: {str(e)}",
            }

    classified: dict[str, list[DBSource]] = {}
    for record in db_records:
        category: str = record.get("category", "catalog")
        data_csv: str = record.get("data", "")  # CSV format data string
        source_item: DBSource = {
            "category": category,
            "data": data_csv,
            "format": "csv",
        }
        if category not in classified:
            classified[category] = []
        classified[category].append(source_item)

    print(f" Collected DB data -> Categories: {list(classified.keys())}")
    return {
        "collected_data": db_records,
        "classified_sources": classified,
        "status": "running",
    }
