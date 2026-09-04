from .policy import (
    calculate_budget_boundary,
    calculate_upsell_score,
    decide_cross_sell,
    decide_upsell,
    select_upsell_candidate,
)


CATALOG = [
    {"id": "basic", "price": 400, "category": "fan"},
    {"id": "better", "price": 550, "category": "fan"},
    {"id": "premium", "price": 650, "category": "fan"},
]


def test_cheapest_or_hard_budget_never_upsells():
    assert decide_upsell(95, hard_budget_constraint=True) == "NO_UPSELL"
    assert calculate_budget_boundary(500, 0.5, hard_budget_constraint=True) == 500


def test_flexible_quality_customer_gets_active_upsell():
    score = calculate_upsell_score(0.2, 0.9, 0.9)
    assert score >= 60
    assert decide_upsell(score) == "ACTIVE_UPSELL"


def test_catalog_upsell_obeys_budget_boundary():
    candidate = select_upsell_candidate(CATALOG, 500, 600)
    assert candidate["id"] == "better"


def test_no_cross_sell_until_primary_is_selected_or_after_rejection():
    assert decide_cross_sell(False, CATALOG) == []
    assert decide_cross_sell(True, CATALOG, rejected=True) == []


def test_cross_sell_is_limited_and_not_repeated():
    options = decide_cross_sell(True, CATALOG, previously_shown=["basic"])
    assert [option["id"] for option in options] == ["better", "premium"]
