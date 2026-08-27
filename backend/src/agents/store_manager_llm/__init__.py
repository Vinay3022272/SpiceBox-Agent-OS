"""
Store Managing Agent — LLM Wiki Maintainer

A LangGraph-powered agent that maintains a persistent, incrementally
updated merchant knowledge wiki. Supports two knowledge sections:
  - Knowledge Base: product facts, specs, reviews, categories
  - Marketing Intelligence: promotions, specialties, popular items

Usage:
    from src.agents.store_managing_agent import run_wiki_agent

    result = run_wiki_agent(
        merchant_id="merchant_123",
        source_folder="./test_data",
        wiki_base_path="./merchant_knowledge",
        wiki_section="knowledge",  # or "marketing"
    )
"""

from .graph import build_wiki_graph
from .state import WikiState
from .utils.file_io import ensure_wiki_structure
from .query_pipeline import query_wiki


def run_wiki_agent(
    merchant_id: str,
    source_folder: str,
    wiki_base_path: str = "./merchant_knowledge",
    wiki_section: str = "knowledge",
) -> WikiState:
    """
    Run the Wiki Maintainer Agent.

    Args:
        merchant_id: Unique merchant identifier
        source_folder: Path to folder with source files (CSV, PDF, etc.)
        wiki_base_path: Root path for the merchant_knowledge/ directory
        wiki_section: Which wiki section to process ("knowledge" or "marketing")

    Returns:
        Final WikiState with all results
    """
    print(f"\n{'='*60}")
    print(f"  Wiki Maintainer Agent")
    print(f"  Merchant: {merchant_id}")
    print(f"  Section: {wiki_section}")
    print(f"  Source: {source_folder}")
    print(f"  Wiki: {wiki_base_path}")
    print(f"{'='*60}\n")

    # Ensure wiki directory structure exists
    paths = ensure_wiki_structure(wiki_base_path)
    print(f"   Wiki structure ready at: {wiki_base_path}")

    # Build initial state
    initial_state: WikiState = {
        "merchant_id": merchant_id,
        "wiki_section": wiki_section,
        "source_dir": source_folder,
        "wiki_base_path": wiki_base_path,
        "uploaded_files": [],
        "classified_sources": {},
        "extracted_products": [],
        "extracted_reviews": [],
        "review_syntheses": [],
        "entities": [],
        "existing_pages": {},
        "pages_to_create": [],
        "pages_to_update": [],
        "contradictions": [],
        "generated_pages": [],
        "index_updates": [],
        "log_entry": {},
        "validation_result": {},
        "validation_errors": [],
        "status": "running",
        "error": "",
    }

    # Build and run graph
    graph = build_wiki_graph()

    print("  ⏳ Running pipeline...\n")
    final_state = graph.invoke(initial_state)

    # Summary
    print(f"\n{'='*60}")
    print(f"  ✅ Pipeline Complete")
    print(f"  Status: {final_state.get('status', 'unknown')}")
    print(f"  Files processed: {len(final_state.get('uploaded_files', []))}")
    print(f"  Products extracted: {len(final_state.get('extracted_products', []))}")
    print(f"  Pages created: {len(final_state.get('pages_to_create', []))}")
    print(f"  Pages updated: {len(final_state.get('pages_to_update', []))}")
    print(f"  Conflicts: {len(final_state.get('contradictions', []))}")
    print(f"  Reviews processed: {len(final_state.get('extracted_reviews', []))}")
    print(f"{'='*60}\n")

    return final_state
