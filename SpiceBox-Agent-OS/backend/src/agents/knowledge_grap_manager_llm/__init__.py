"""
Knowledge Graph Manager Agent — LLM Wiki Maintainer

A LangGraph-powered agent that maintains a persistent, incrementally
updated merchant knowledge wiki. Supports two knowledge sections:
  - Knowledge Base: product facts, specs, reviews, categories
  - Marketing Intelligence: promotions, specialties, popular items

Usage:
    from src.agents.knowledge_grap_manager_llm import run_wiki_agent

    # Single autonomous call runs entire lifecycle (knowledge + marketing)
    result = run_wiki_agent(
        merchant_id="default_merchant",
        wiki_base_path="./merchant_knowledge",
        wiki_section="both",
        on_progress=lambda stage, data: print(f"Stage: {stage}")
    )
"""

from typing import Any, Callable, Optional, Dict

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
    query_upsell_alternatives,
)


def _format_stage_label(node_name: str, step_data: dict, section: str) -> str:
    """Produce clean, human-readable stage descriptions for progress streaming."""
    sec_prefix = f"[{section.capitalize()}]"

    if node_name == "collect_data":
        count = len(step_data.get("collected_data", []))
        return f"{sec_prefix} Fetched {count} dataset records from database..."

    if node_name == "extract_entities":
        count = len(step_data.get("extracted_products", []))
        return f"{sec_prefix} Extracted {count} unique product catalog entities..."

    if node_name == "extract_reviews":
        rev_count = len(step_data.get("extracted_reviews", []))
        syn_count = len(step_data.get("review_syntheses", []))
        return f"{sec_prefix} Processed {rev_count} reviews, synthesized {syn_count} customer sentiment summaries..."

    if node_name == "search_existing_wiki":
        pages = len(step_data.get("existing_pages", {}))
        return f"{sec_prefix} Indexed {pages} existing wiki pages for diffing..."

    if node_name == "knowledge_diff":
        creates = len(step_data.get("pages_to_create", []))
        updates = len(step_data.get("pages_to_update", []))
        return f"{sec_prefix} Computed diff: {creates} pages to create, {updates} to update..."

    if node_name == "create_pages":
        created = len(step_data.get("generated_pages", []))
        return f"{sec_prefix} Generated {created} markdown dossiers with relational links..."

    if node_name == "update_pages":
        return f"{sec_prefix} Updated existing pages with latest catalog data..."

    if node_name == "resolve_conflict":
        return f"{sec_prefix} Resolved any spec and pricing conflicts..."

    if node_name == "cross_reference":
        return f"{sec_prefix} Populated cross-references, category links & complementary pairings..."

    if node_name == "update_index":
        return f"{sec_prefix} Generated master index.md catalog & category directories..."

    if node_name == "append_log":
        return f"{sec_prefix} Recorded transaction log entry to log.json..."

    if node_name == "validate_wiki":
        health = step_data.get("validation_result", {}).get("health_score", 1.0)
        return f"{sec_prefix} Validated wiki structure & link integrity (Health: {health * 100:.0f}%)..."

    return f"{sec_prefix} Executing {node_name}..."


def _run_single_section(
    merchant_id: str,
    wiki_base_path: str,
    section: str,
    collected_data: list[dict[str, Any]] | None = None,
    on_progress: Optional[Callable[[str, dict], None]] = None,
) -> WikiState:
    """Internal runner for executing the LangGraph for one wiki section with streaming."""
    ensure_wiki_structure(wiki_base_path)

    initial_state: WikiState = {
        "merchant_id": merchant_id,
        "wiki_section": section,
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
            "section": section,
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

    graph = build_wiki_graph()
    current_state: dict = dict(initial_state)

    if on_progress:
        on_progress(f"[{section.capitalize()}] Starting agent workflow...", current_state)

    try:
        # Stream the graph step-by-step
        for step in graph.stream(initial_state):
            for node_name, step_output in step.items():
                if isinstance(step_output, dict):
                    current_state.update(step_output)
                    if on_progress:
                        msg = _format_stage_label(node_name, step_output, section)
                        on_progress(msg, step_output)
    except Exception as e:
        print(f"  [Agent Stream Error in {section}]: {e}")
        # Fallback to invoke if streaming raises unexpected edge error
        current_state = graph.invoke(initial_state)

    return current_state  # type: ignore


def run_wiki_agent(
    merchant_id: str = "default_merchant",
    wiki_base_path: str = "./merchant_knowledge",
    wiki_section: str = "knowledge",
    collected_data: list[dict[str, Any]] | None = None,
    on_progress: Optional[Callable[[str, dict], None]] = None,
) -> WikiState:
    """
    Run the Knowledge Graph Manager Wiki Maintainer Agent.
    Natively orchestrates the full lifecycle for 'knowledge', 'marketing', or 'both'.

    Args:
        merchant_id: Unique merchant identifier
        wiki_base_path: Root path for the merchant_knowledge/ directory
        wiki_section: Target section ('both', 'knowledge', or 'marketing')
        collected_data: Optional pre-fetched raw records
        on_progress: Optional progress callback receiving (stage_description, state_dict)

    Returns:
        Final WikiState of the executed pipeline
    """
    print(f"\n{'='*60}")
    print(f"  Knowledge Graph Manager Agent")
    print(f"  Merchant: {merchant_id}")
    print(f"  Section:  {wiki_section}")
    print(f"  Wiki Path: {wiki_base_path}")
    print(f"{'='*60}\n")

    if wiki_section == "both":
        # Phase 1: Core Knowledge section (catalog, specs, reviews, categories)
        if on_progress:
            on_progress("Initializing Knowledge Base section...", {})
        state_knowledge = _run_single_section(
            merchant_id=merchant_id,
            wiki_base_path=wiki_base_path,
            section="knowledge",
            collected_data=collected_data,
            on_progress=on_progress,
        )

        # Phase 2: Marketing Intelligence section (popular items, promotions, specialties)
        if on_progress:
            on_progress("Initializing Marketing Intelligence section...", {})
        state_marketing = _run_single_section(
            merchant_id=merchant_id,
            wiki_base_path=wiki_base_path,
            section="marketing",
            collected_data=collected_data,
            on_progress=on_progress,
        )

        # Combined summary state
        final_state = dict(state_marketing)
        final_state["knowledge_state"] = state_knowledge
        final_state["status"] = "success" if (state_knowledge.get("status") != "error" and state_marketing.get("status") != "error") else "error"

        print(f"\n{'='*60}")
        print(f"  Agent Completed: Both Sections (Knowledge + Marketing)")
        print(f"  Status: {final_state.get('status')}")
        print(f"{'='*60}\n")

        if on_progress:
            on_progress("Agent completed successfully! Wiki is fully synchronized.", final_state)

        return final_state  # type: ignore

    # Single section mode
    final_state = _run_single_section(
        merchant_id=merchant_id,
        wiki_base_path=wiki_base_path,
        section=wiki_section,
        collected_data=collected_data,
        on_progress=on_progress,
    )

    print(f"\n{'='*60}")
    print(f"  Agent Completed: {wiki_section.capitalize()} section")
    print(f"  Status: {final_state.get('status')}")
    print(f"{'='*60}\n")

    if on_progress:
        on_progress(f"Agent completed: {wiki_section.capitalize()} section updated.", final_state)

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
    "query_upsell_alternatives",
]
