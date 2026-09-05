"""State contract for the Intent Analyzer LangGraph."""

from typing import Any, Dict, List, Optional, TypedDict


class IntentAnalysisState(TypedDict, total=False):
    """Minimal state owned by the intent-analysis subgraph.

    It deliberately accepts the Merchant graph's message and selling fields so
    the subgraph can be embedded without translating state or duplicating tools.
    """

    messages: List[Any]
    wiki_base_path: str
    intent_history: List[Dict[str, Any]]
    cross_sell_shown: List[str]
    cross_sell_rejected: bool
    product_need: Optional[str]
    catalog_context: List[Dict[str, Any]]
    candidate_products: List[Dict[str, Any]]
    stated_budget: Optional[float]
    effective_budget: Optional[float]
    acceptable_budget_stretch: Optional[float]
    budget_restrictiveness: float
    quality_value_orientation: float
    upsell_openness: float
    upsell_opportunity_score: float
    upsell_decision: str
    intent_confidence: float
    intent_evidence: Dict[str, str]
    recommended_product: Optional[Dict[str, Any]]
    cross_sell_candidates: List[Dict[str, Any]]
