"""Intent-aware selling support for the Merchant Commerce Agent."""

from .policy import (
    calculate_budget_boundary,
    calculate_upsell_score,
    decide_cross_sell,
    decide_upsell,
    select_upsell_candidate,
)
from .schema import CustomerIntent
from .graph import build_intent_analyzer_graph


def analyze_selling_context(*args, **kwargs):
    """Lazy import keeps the deterministic policy usable without LLM extras."""
    from .analyzer import _analyze_selling_context
    return _analyze_selling_context(*args, **kwargs)

__all__ = [
    "CustomerIntent",
    "analyze_selling_context",
    "calculate_budget_boundary",
    "calculate_upsell_score",
    "decide_cross_sell",
    "decide_upsell",
    "select_upsell_candidate",
    "build_intent_analyzer_graph",
]
