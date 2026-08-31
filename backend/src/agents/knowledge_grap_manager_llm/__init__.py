"""
Knowledge Graph Manager Agent — LLM Wiki Maintainer

A LangGraph-powered agent that maintains a persistent, incrementally
updated merchant knowledge wiki. Supports two knowledge sections:
  - Knowledge Base: product facts, specs, reviews, categories
  - Marketing Intelligence: promotions, specialties, popular items

Usage:
    from src.agents.knowledge_grap_manager_llm import run_wiki_agent

    result = run_wiki_agent(
        merchant_id="merchant_123",
        wiki_base_path="./merchant_knowledge",
        wiki_section="knowledge",  # or "marketing"
    )
"""

from typing import Any

from .graph import build_wiki_graph
from .state import (
    WikiState,
    DBSource,
    ExtractedProduct,
    ExtractedReview,
    ReviewSynthesis,
    WikiPage,
    Contradiction,
    LogEntry,
    ValidationResult,
)
from .utils.file_io import ensure_wiki_structure
from .query_pipeline import (
    query_wiki,
    query_knowledge_base,
    query_marketing_intelligence,
)


def run_wiki_agent(
    merchant_id: str,
    wiki_base_path: str = "./merchant_knowledge",
    wiki_section: str = "knowledge",
    collected_data: list[dict[str, Any]] | None = None,
) -> WikiState:
    """
    Run the Knowledge Graph Manager Wiki Maintainer Agent.

    Args:
        merchant_id: Unique merchant identifier
        wiki_base_path: Root path for the merchant_knowledge/ directory
        wiki_section: Which wiki section to process ("knowledge" or "marketing")
        collected_data: Optional pre-fetched raw records (each with category and CSV data string)

    Returns:
        Final WikiState with all results
    """
    print(f"\n{'='*60}")
    print(f"  Knowledge Graph Manager Agent")
    print(f"  Merchant: {merchant_id}")
    print(f"  Section: {wiki_section}")
    print(f"  Wiki Path: {wiki_base_path}")
    print(f"{'='*60}\n")

    # Ensure wiki directory structure exists
    paths = ensure_wiki_structure(wiki_base_path)
    print(f"  Wiki structure ready at: {wiki_base_path}")

    # Build initial state
    initial_state: WikiState = {
        "merchant_id": merchant_id,
        "wiki_section": wiki_section,
        "wiki_base_path": wiki_base_path,
        "collected_data": collected_data or [],
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
        "log_entry": {
            "timestamp": "",
            "operation": "ingest",
            "section": wiki_section,
            "files_processed": [],
            "products_added": 0,
            "products_updated": 0,
            "reviews_processed": 0,
            "pages_created": [],
            "pages_updated": [],
            "conflicts": 0,
            "status": "PENDING",
            "errors": [],
        },
        "validation_result": {
            "orphan_pages": [],
            "duplicate_products": [],
            "missing_reviews": [],
            "conflicting_specs": [],
            "outdated_prices": [],
            "broken_links": [],
            "health_score": 1.0,
        },
        "validation_errors": [],
        "status": "running",
        "error": "",
    }

    # Build and run graph
    graph = build_wiki_graph()

    print("  Running pipeline...\n")
    final_state = graph.invoke(initial_state)

    # Summary
    print(f"\n{'='*60}")
    print(f"  Pipeline Complete")
    print(f"  Status: {final_state.get('status', 'unknown')}")
    print(f"  Records processed: {len(final_state.get('collected_data', []))}")
    print(f"  Products extracted: {len(final_state.get('extracted_products', []))}")
    print(f"  Pages created: {len(final_state.get('pages_to_create', []))}")
    print(f"  Pages updated: {len(final_state.get('pages_to_update', []))}")
    print(f"  Conflicts: {len(final_state.get('contradictions', []))}")
    print(f"  Reviews processed: {len(final_state.get('extracted_reviews', []))}")
    print(f"{'='*60}\n")

    return final_state


__all__ = [
    "build_wiki_graph",
    "run_wiki_agent",
    "WikiState",
    "DBSource",
    "ExtractedProduct",
    "ExtractedReview",
    "ReviewSynthesis",
    "WikiPage",
    "Contradiction",
    "LogEntry",
    "ValidationResult",
    "query_wiki",
    "query_knowledge_base",
    "query_marketing_intelligence",
]
