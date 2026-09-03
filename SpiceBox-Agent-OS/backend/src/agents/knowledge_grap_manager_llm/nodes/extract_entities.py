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
    """Extract products from CSV rows, supporting both structured catalog schemas and unstructured data."""
    if not rows:
        return []

    products = []

    # Check if rows already contain structured product columns
    sample = rows[0]
    has_structured_fields = any(k in sample for k in ["name", "title", "product_name"]) and any(k in sample for k in ["slug", "handle", "product_slug", "price", "description"])

    if has_structured_fields:
        for r in rows:
            name = (r.get("name") or r.get("title") or r.get("product_name") or "").strip()
            slug = (r.get("slug") or r.get("handle") or r.get("product_slug") or slugify(name)).strip()
            if not name or not slug:
                continue

            brand = (r.get("brand") or r.get("subtitle") or "SpiceBox").strip()
            category = (r.get("category") or "").strip()
            price = str(r.get("price") or "").strip()
            currency = (r.get("currency") or "INR").strip().upper()
            description = (r.get("description") or "").strip()

            # Collect specifications
            specs: dict[str, Any] = {}
            for k, v in r.items():
                if k.lower() not in ("name", "title", "slug", "handle", "brand", "subtitle", "category", "price", "currency", "description") and v:
                    specs[k] = v

            products.append(ExtractedProduct(
                name=name,
                slug=slug,
                brand=brand,
                category=category,
                price=price,
                currency=currency,
                description=description,
                specifications=specs,
                source_file=source_name,
                raw_data=r,
            ))

        if products:
            return products

    # Fallback to LLM extraction for unstructured text/CSVs in batches of 15
    for batch_start in range(0, len(rows), 15):
        batch = rows[batch_start:batch_start + 15]
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
            extracted = result.get("products", []) if isinstance(result, dict) else []

            for p in extracted:
                if not isinstance(p, dict):
                    continue
                name = p.get("name", "").strip()
                if not name:
                    continue
                slug = slugify(name)
                products.append(ExtractedProduct(
                    name=name,
                    slug=slug,
                    brand=p.get("brand", ""),
                    category=p.get("category", ""),
                    price=str(p.get("price", "")),
                    currency=p.get("currency", "INR"),
                    description=p.get("description", ""),
                    specifications=p.get("specifications", {}) if isinstance(p.get("specifications"), dict) else {},
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

            rows = _parse_csv_data(raw_csv)
            if not rows:
                continue

            products = _extract_from_csv_rows(rows, source_name=source_name)

            for p in products:
                if p["slug"] not in seen_slugs:
                    all_products.append(p)
                    seen_slugs.add(p["slug"])

    print(f"✔ Extracted {len(all_products)} unique product entities")
    return {"extracted_products": all_products}
