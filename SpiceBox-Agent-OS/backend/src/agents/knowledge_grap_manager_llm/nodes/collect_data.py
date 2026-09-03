import os
import io
import csv
from typing import Any
import requests
from ..state import WikiState, DBSource


def fetch_db_data(merchant_id: str, section: str, limit: int = 500) -> list[dict[str, Any]]:
    """
    Fetch live commerce datasets for merchant from Medusa extraction API.
    Returns list of dicts: [{"category": "catalog", "data": "csv_data...", "format": "csv"}, ...]
    """
    medusa_url = os.getenv("MEDUSA_URL", "http://localhost:9001")
    admin_email = os.getenv("MEDUSA_ADMIN_EMAIL", "admin@admin.com")
    admin_password = os.getenv("MEDUSA_ADMIN_PASSWORD", "adminpassword")

    try:
        # Authenticate with Medusa Admin
        auth_resp = requests.post(
            f"{medusa_url}/auth/user/emailpass",
            json={"email": admin_email, "password": admin_password},
            timeout=5
        )
        if auth_resp.status_code == 200:
            token = auth_resp.json().get("token")
            extract_resp = requests.get(
                f"{medusa_url}/admin/merchant-wiki/extract",
                params={"merchant_id": merchant_id, "limit": str(limit)},
                headers={"Authorization": f"Bearer {token}"},
                timeout=15
            )
            if extract_resp.status_code == 200:
                results = extract_resp.json()
                if results and isinstance(results, list):
                    print(f"  [fetch_db_data] Fetched {len(results)} datasets from Medusa API ({medusa_url})")
                    return results
    except Exception as e:
        print(f"  [fetch_db_data] Medusa API extraction failed ({e}), trying direct DB...")

    # Fallback to direct PostgreSQL
    try:
        import psycopg2
        import psycopg2.extras
        db_url = os.getenv("DATABASE_URL", "postgresql://postgres:postgres@localhost:5433/medusa-store")
        conn = psycopg2.connect(db_url)
        cur = conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor)

        # Query active schema mappings
        cur.execute("""
            SELECT domain, source_table, field_mappings 
            FROM merchant_schema_mapping 
            WHERE is_active = true;
        """)
        mappings = cur.fetchall()

        records = []
        for m in mappings:
            domain = m["domain"]
            src_table = m["source_table"]
            # Basic fallback query if needed
            cur.execute(f"SELECT * FROM {src_table} LIMIT {limit};")
            rows = cur.fetchall()
            if rows:
                output = io.StringIO()
                writer = csv.DictWriter(output, fieldnames=list(rows[0].keys()))
                writer.writeheader()
                writer.writerows([dict(r) for r in rows])
                records.append({
                    "category": domain,
                    "data": output.getvalue(),
                    "format": "csv"
                })
        conn.close()
        print(f"  [fetch_db_data] Fetched {len(records)} datasets directly from PostgreSQL")
        return records
    except Exception as e:
        print(f"  [fetch_db_data] Direct DB extraction failed: {e}")
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

        # Ensure plural/singular aliases (review <-> reviews)
        if category == "reviews" and "review" not in classified:
            classified["review"] = [source_item]
        elif category == "review" and "reviews" not in classified:
            classified["reviews"] = [source_item]

    print(f"✔ Collected DB data -> Categories: {list(classified.keys())}")
    return {
        "collected_data": db_records,
        "classified_sources": classified,
        "status": "running",
    }
