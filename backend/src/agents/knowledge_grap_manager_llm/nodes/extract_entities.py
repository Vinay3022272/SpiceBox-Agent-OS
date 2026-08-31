import json
import csv
import io
from typing import Any

from ..state import WikiState, ExtractedProduct
from ..utils.llm import call_llm_json
from ..utils.file_io import slugify


def _parse_csv_data(csv_data: str | list) -> list[dict]:
    """Parse CSV text string into a list of row dictionaries."""
    if isinstance(csv_data, list):
        return csv_data
    if not csv_data or not str(csv_data).strip():
        return []

    try:
        reader = csv.DictReader(io.StringIO(csv_data))
        return [dict(row) for row in reader]
    except Exception as e:
        print(f"  Error parsing CSV string: {e}")
        return []


def _extract_from_csv_rows(rows: list[dict], source_name: str = "db_catalog") -> list[ExtractedProduct]:
    """Extract products from CSV rows using LLM in batches of 50."""
    if not rows:
        return []

    products = []

    for batch_start in range(0, len(rows), 50):
        batch = rows[batch_start:batch_start + 50]
        batch_json = json.dumps(batch, default=str, indent=2)

        prompt = (
            f"Extract product entities from these catalog rows.\n\n"
            f"Data:\n{batch_json}\n\n"
            f"For each product, extract:\n"
            f"- name: product name\n"
            f"- brand: brand/manufacturer\n"
            f"- category: product category\n"
            f"- price: price as string\n"
            f"- currency: currency code (default INR)\n"
            f"- description: brief description\n"
            f"- specifications: dict of key-value spec pairs\n\n"
            f"Return JSON: {{\"products\": [{{...}}]}}"
        )

        try:
            result = call_llm_json(prompt, system="You are a product data extractor. Extract structured product information.")
            extracted = result.get("products", [])

            for p in extracted:
                slug = slugify(p.get("name", "unknown"))
                products.append(ExtractedProduct(
                    name=p.get("name", ""),
                    slug=slug,
                    brand=p.get("brand", ""),
                    category=p.get("category", ""),
                    price=str(p.get("price", "")),
                    currency=p.get("currency", "INR"),
                    description=p.get("description", ""),
                    specifications=p.get("specifications", {}),
                    source_file=source_name,
                    raw_data=p,
                ))
        except Exception as e:
            print(f"  Error extracting from CSV batch: {e}")

    return products


def extract_entities(state: WikiState) -> dict:
    """
    Extract product entities from DB data in state (catalog, promotion, documents).
    Deduplicates products by canonical slug.
    """
    classified = state.get("classified_sources", {})
    all_products: list[ExtractedProduct] = []
    seen_slugs: set[str] = set()

    # Target categories that contain product information
    target_categories = ["catalog", "promotion", "documents", "document"]

    for category in target_categories:
        sources = classified.get(category, [])
        for index, source_item in enumerate(sources):
            raw_csv = source_item.get("data", "")
            source_name = f"db_{category}_{index + 1}"

            # Parse CSV string from DB into row dicts
            rows = _parse_csv_data(raw_csv)
            if not rows:
                continue

            # Extract products using LLM batching
            products = _extract_from_csv_rows(rows, source_name=source_name)

            for p in products:
                if p["slug"] not in seen_slugs:
                    all_products.append(p)
                    seen_slugs.add(p["slug"])

    print(f"  Extracted {len(all_products)} unique product entities")
    return {"extracted_products": all_products}
