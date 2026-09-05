"""Deterministic, catalog-grounded selling policy.

No LLM is allowed to make a final selling decision in this module.
"""

from __future__ import annotations

from typing import Any, Dict, Iterable, List, Optional


def calculate_upsell_score(
    budget_restrictiveness: float,
    quality_value_orientation: float,
    upsell_openness: float,
) -> float:
    """Return the explainable 0-100 upsell opportunity score."""
    score = 100 * (
        0.45 * upsell_openness
        + 0.30 * quality_value_orientation
        + 0.25 * (1 - budget_restrictiveness)
    )
    return round(max(0.0, min(100.0, score)), 2)


def calculate_budget_boundary(
    stated_budget: Optional[float], acceptable_budget_stretch: Optional[float], hard_budget_constraint: bool = False
) -> Optional[float]:
    if stated_budget is None:
        return None
    if hard_budget_constraint:
        return stated_budget
    return round(stated_budget * (1 + (acceptable_budget_stretch or 0.0)), 2)


def decide_upsell(score: float, hard_budget_constraint: bool = False) -> str:
    """Choose selling intensity; a hard budget is always a safety override."""
    if hard_budget_constraint or score < 30:
        return "NO_UPSELL"
    if score < 60:
        return "SOFT_UPSELL"
    return "ACTIVE_UPSELL"


def select_upsell_candidate(
    candidates: Iterable[Dict[str, Any]],
    stated_budget: Optional[float],
    maximum_acceptable_price: Optional[float],
) -> Optional[Dict[str, Any]]:
    """Select the cheapest real upgrade within the customer's stated boundary."""
    normalized = [p for p in candidates if isinstance(p.get("price"), (int, float))]
    normalized.sort(key=lambda p: p["price"])
    if not normalized:
        return None
    baseline = next((p for p in normalized if stated_budget is None or p["price"] <= stated_budget), normalized[0])
    ceiling = maximum_acceptable_price
    for product in normalized:
        if product["price"] <= baseline["price"]:
            continue
        if ceiling is not None and product["price"] > ceiling:
            continue
        return product
    return None


def decide_cross_sell(
    primary_selected: bool,
    candidates: List[Dict[str, Any]],
    previously_shown: Iterable[str] = (),
    rejected: bool = False,
) -> List[Dict[str, Any]]:
    """Return at most two unshown, catalog-grounded complementary products."""
    if not primary_selected or rejected:
        return []
    shown = set(previously_shown)
    return [p for p in candidates if p.get("id") not in shown][:2]
