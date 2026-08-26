"""
extract_entities — LLM NODE

Extracts product entities from catalog CSVs and PDF documents.
Each entity gets a canonical slug for deduplication.
"""

import json
try:
    from ..state import WikiState, ExtractedProduct
    from ..utils.llm import call_llm_json
    from ..utils.csv_reader import read_csv
    from ..utils.pdf_reader import extract_text_from_pdf
    from ..utils.file_io import slugify
except (ImportError, ValueError):
    from src.agents.store_manager_llm.state import WikiState, ExtractedProduct
    from src.agents.store_manager_llm.utils.llm import call_llm_json
    from src.agents.store_manager_llm.utils.csv_reader import read_csv
    from src.agents.store_manager_llm.utils.pdf_reader import extract_text_from_pdf
    from src.agents.store_manager_llm.utils.file_io import slugify


def _extract_from_csv_rows(rows: list[dict], source_file: str) -> list[ExtractedProduct]:
    """Extract products from CSV rows using LLM."""
    if not rows:
        return []

    # Send batch of rows to LLM for structured extraction
    # Limit to 50 rows per batch to stay within token limits
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
                    source_file=source_file,
                    raw_data=p,
                ))
        except Exception as e:
            print(f"   Error extracting from CSV batch: {e}")

    return products


def _extract_from_pdf(pdf_path: str) -> list[ExtractedProduct]:
    """Extract products from a PDF document using LLM."""
    try:
        text = extract_text_from_pdf(pdf_path)
    except Exception as e:
        print(f"  Error reading PDF: {e}")
        return []

    if not text.strip():
        return []

    # Truncate to ~8k chars for token limits
    text = text[:8000]

    prompt = (
        f"Extract product entities from this document text.\n\n"
        f"Document:\n{text}\n\n"
        f"For each product found, extract:\n"
        f"- name: product name\n"
        f"- brand: brand/manufacturer\n"
        f"- category: product category\n"
        f"- price: price if mentioned\n"
        f"- currency: currency code (default INR)\n"
        f"- description: brief description\n"
        f"- specifications: dict of key-value spec pairs\n\n"
        f"Return JSON: {{\"products\": [{{...}}]}}"
    )

    try:
        result = call_llm_json(prompt, system="You are a product data extractor. Extract structured product information from documents.")
        extracted = result.get("products", [])
        products = []

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
                source_file=pdf_path,
                raw_data=p,
            ))

        return products
    except Exception as e:
        print(f"  Error extracting from PDF: {e}")
        return []


def extract_entities(state: WikiState) -> dict:
    """
    Extract product entities from all catalog and document sources.
    Deduplicates by slug.
    """
    classified = state.get("classified_sources", {})
    all_products: list[ExtractedProduct] = []
    seen_slugs: set[str] = set()

    # Process catalog CSVs
    for file_info in classified.get("catalog", []):
        try:
            rows = read_csv(file_info["path"])
            products = _extract_from_csv_rows(rows, file_info["filename"])
            for p in products:
                if p["slug"] not in seen_slugs:
                    all_products.append(p)
                    seen_slugs.add(p["slug"])
        except Exception as e:
            print(f" Error processing {file_info['filename']}: {e}")

    # Process PDF documents
    for file_info in classified.get("documents", []):
        if file_info["extension"] == ".pdf":
            products = _extract_from_pdf(file_info["path"])
            for p in products:
                if p["slug"] not in seen_slugs:
                    all_products.append(p)
                    seen_slugs.add(p["slug"])

    # Process promotion files (for marketing section)
    for file_info in classified.get("promotion", []):
        try:
            rows = read_csv(file_info["path"])
            products = _extract_from_csv_rows(rows, file_info["filename"])
            for p in products:
                if p["slug"] not in seen_slugs:
                    all_products.append(p)
                    seen_slugs.add(p["slug"])
        except Exception as e:
            print(f"  Error processing {file_info['filename']}: {e}")

    print(f"  Extracted {len(all_products)} unique product entities")
    return {"extracted_products": all_products}
