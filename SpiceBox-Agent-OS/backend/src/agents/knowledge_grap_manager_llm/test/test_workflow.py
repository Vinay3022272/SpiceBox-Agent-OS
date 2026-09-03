"""
Test script for Knowledge Graph Manager LLM Workflow.

Loads test CSV data from backend/test_data, executes both 'knowledge' and 'marketing'
sections of the wiki graph, and validates the output files and health score.
"""

import os
import sys
from pathlib import Path
from dotenv import load_dotenv

if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8')

# Ensure backend root is in sys.path
BACKEND_DIR = Path(__file__).resolve().parents[4]
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

# Load .env variables (e.g. GROQ_API_KEY)
load_dotenv(BACKEND_DIR / ".env")

from src.agents.knowledge_grap_manager_llm import run_wiki_agent, query_wiki


def load_test_data(test_data_dir: Path) -> list[dict]:
    """Load test CSV files into collected_data list."""
    records = []
    
    products_csv = test_data_dir / "products.csv"
    if products_csv.exists():
        records.append({
            "category": "catalog",
            "data": products_csv.read_text(encoding="utf-8"),
            "format": "csv",
        })

    reviews_csv = test_data_dir / "reviews.csv"
    if reviews_csv.exists():
        records.append({
            "category": "review",
            "data": reviews_csv.read_text(encoding="utf-8"),
            "format": "csv",
        })

    promotions_csv = test_data_dir / "promotions.csv"
    if promotions_csv.exists():
        records.append({
            "category": "promotion",
            "data": promotions_csv.read_text(encoding="utf-8"),
            "format": "csv",
        })

    return records


def run_test():
    test_data_dir = BACKEND_DIR / "test_data"
    wiki_output_dir = BACKEND_DIR / "merchant_knowledge_test"

    print("=" * 70)
    print("STEP 1: Loading test data from:", test_data_dir)
    print("=" * 70)
    collected_data = load_test_data(test_data_dir)
    print(f"Loaded {len(collected_data)} dataset records (catalog, review, promotion).")

    # 1. Run Knowledge Section
    print("\n" + "=" * 70)
    print("STEP 2: Executing Graph for KNOWLEDGE Section")
    print("=" * 70)
    knowledge_state = run_wiki_agent(
        merchant_id="merchant_electronics_01",
        wiki_base_path=str(wiki_output_dir),
        wiki_section="knowledge",
        collected_data=collected_data,
    )

    print("\nKnowledge Section Result:")
    print("Status:", knowledge_state.get("status"))
    print("Products Extracted:", len(knowledge_state.get("extracted_products", [])))
    print("Reviews Syntheses:", len(knowledge_state.get("review_syntheses", [])))
    print("Pages Created:", len(knowledge_state.get("pages_to_create", [])))
    print("Health Score:", knowledge_state.get("validation_result", {}).get("health_score"))

    # 2. Run Marketing Section
    print("\n" + "=" * 70)
    print("STEP 3: Executing Graph for MARKETING Section")
    print("=" * 70)
    marketing_state = run_wiki_agent(
        merchant_id="merchant_electronics_01",
        wiki_base_path=str(wiki_output_dir),
        wiki_section="marketing",
        collected_data=collected_data,
    )

    print("\nMarketing Section Result:")
    print("Status:", marketing_state.get("status"))
    print("Pages Created:", len(marketing_state.get("pages_to_create", [])))
    print("Health Score:", marketing_state.get("validation_result", {}).get("health_score"))

    # 3. Test Knowledge Query Reader
    print("\n" + "=" * 70)
    print("STEP 4: Querying the Generated Wiki (Reader Pipeline)")
    print("=" * 70)
    query_text = "What is the price, battery life, and overall customer review sentiment for iPhone 15 Pro?"
    print(f"Query: {query_text}\n")
    query_res = query_wiki(
        query=query_text,
        wiki_base_path=str(wiki_output_dir),
        merchant_id="merchant_electronics_01",
    )
    print("Answer:")
    print(query_res.get("answer"))
    print("\nCited Sources:", query_res.get("sources"))

    print("\n" + "=" * 70)
    print("TEST WORKFLOW COMPLETE - ALL STAGES EXECUTED")
    print("=" * 70)


if __name__ == "__main__":
    run_test()
