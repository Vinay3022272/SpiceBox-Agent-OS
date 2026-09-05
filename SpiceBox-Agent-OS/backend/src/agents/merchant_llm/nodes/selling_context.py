"""Bridge the intent/policy agent into the existing merchant graph."""

from pathlib import Path
from typing import Any, Dict

from ...intent_analyzer_llm import build_intent_analyzer_graph
from ..state import CommerceState

_BACKEND_DIR = Path(__file__).resolve().parents[4]


def selling_context_node(state: CommerceState) -> Dict[str, Any]:
    """Ground a sales turn in the existing knowledge wiki before the Merchant LLM responds."""
    graph = build_intent_analyzer_graph()
    # This is a focused subgraph invocation, not a second merchant orchestrator.
    result = graph.invoke({**state, "wiki_base_path": str(_BACKEND_DIR / "merchant_knowledge")})
    output_keys = (
        "product_need", "catalog_context", "candidate_products", "stated_budget",
        "effective_budget", "acceptable_budget_stretch", "budget_restrictiveness",
        "quality_value_orientation", "upsell_openness", "upsell_opportunity_score",
        "upsell_decision", "intent_confidence", "intent_evidence", "intent_history",
        "questions_asked", "recommended_product", "cross_sell_candidates",
    )
    return {key: result[key] for key in output_keys if key in result}
