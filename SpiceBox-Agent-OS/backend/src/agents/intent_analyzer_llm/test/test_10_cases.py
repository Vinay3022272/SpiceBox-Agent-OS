"""
Comprehensive test suite for the 10 Intent Analyzer test cases.
Runs both rule-based deterministic evaluation and subgraph state graph execution.
"""

from pathlib import Path
import os
import sys
import json
from langchain_core.messages import HumanMessage, AIMessage

# Ensure path is backend root
backend_root = Path(__file__).resolve().parents[4]
sys.path.insert(0, str(backend_root))

from src.agents.intent_analyzer_llm.analyzer import _analyze_selling_context
from src.agents.intent_analyzer_llm.policy import (
    calculate_upsell_score,
    calculate_budget_boundary,
    decide_upsell,
    select_upsell_candidate,
    decide_cross_sell,
)
from src.agents.intent_analyzer_llm.graph import build_intent_analyzer_graph

WIKI_PATH = str(backend_root / "merchant_knowledge")
os.environ["INTENT_ANALYZER_LLM"] = "false"

def run_test_cases():
    results = []
    
    # =========================================================================
    # Test 1: Customer wants cheapest possible product -> Expected: NO_UPSELL
    # =========================================================================
    t1_state = {
        "messages": [HumanMessage(content="Show me the cheapest possible phone available around Rs 10000.")]
    }
    t1_res = _analyze_selling_context(t1_state, WIKI_PATH)
    t1_passed = (
        t1_res["upsell_decision"] == "NO_UPSELL"
        and t1_res["budget_restrictiveness"] >= 0.75
    )
    results.append({
        "test_id": "Test 1",
        "title": "Customer wants cheapest possible product",
        "input": t1_state["messages"][0].content,
        "expected": "NO_UPSELL",
        "actual": t1_res["upsell_decision"],
        "details": {
            "upsell_score": t1_res["upsell_opportunity_score"],
            "budget_restrictiveness": t1_res["budget_restrictiveness"],
            "quality_value_orientation": t1_res["quality_value_orientation"],
            "stated_budget": t1_res["stated_budget"]
        },
        "passed": t1_passed
    })

    # =========================================================================
    # Test 2: Customer has flexible budget -> Expected: ACTIVE_UPSELL
    # =========================================================================
    t2_state = {
        "messages": [HumanMessage(content="I want a top quality smartwatch, I have a flexible budget and willing to stretch extra Rs 5000 for something genuinely better.")]
    }
    t2_res = _analyze_selling_context(t2_state, WIKI_PATH)
    t2_passed = (
        t2_res["upsell_decision"] in ("ACTIVE_UPSELL", "SOFT_UPSELL")
        and t2_res["upsell_openness"] >= 0.7
    )
    results.append({
        "test_id": "Test 2",
        "title": "Customer has flexible budget",
        "input": t2_state["messages"][0].content,
        "expected": "ACTIVE_UPSELL / High Openness",
        "actual": t2_res["upsell_decision"],
        "details": {
            "upsell_score": t2_res["upsell_opportunity_score"],
            "upsell_openness": t2_res["upsell_openness"],
            "quality_value_orientation": t2_res["quality_value_orientation"]
        },
        "passed": t2_passed
    })

    # =========================================================================
    # Test 3: Customer wants quality and accepts small budget stretch -> Expected: SOFT/ACTIVE_UPSELL
    # =========================================================================
    t3_state = {
        "messages": [HumanMessage(content="I need a reliable durable watch around Rs 5000 and can stretch Rs 1000 for better quality.")]
    }
    t3_res = _analyze_selling_context(t3_state, WIKI_PATH)
    t3_passed = (
        t3_res["upsell_decision"] in ("SOFT_UPSELL", "ACTIVE_UPSELL")
        and t3_res["stated_budget"] == 5000.0
        and t3_res["effective_budget"] == 6000.0
    )
    results.append({
        "test_id": "Test 3",
        "title": "Customer wants quality and accepts small budget stretch",
        "input": t3_state["messages"][0].content,
        "expected": "SOFT/ACTIVE_UPSELL with effective budget Rs 6000",
        "actual": f"{t3_res['upsell_decision']} (Effective Budget: Rs {t3_res['effective_budget']})",
        "details": {
            "stated_budget": t3_res["stated_budget"],
            "effective_budget": t3_res["effective_budget"],
            "acceptable_budget_stretch": t3_res["acceptable_budget_stretch"],
            "upsell_score": t3_res["upsell_opportunity_score"]
        },
        "passed": t3_passed
    })

    # =========================================================================
    # Test 4: Customer explicitly rejects higher price -> Expected: NO_AGGRESSIVE_UPSELL / NO_UPSELL
    # =========================================================================
    t4_state = {
        "messages": [HumanMessage(content="I want a watch under Rs 4000. Do not show anything above that price, not a single rupee more.")]
    }
    t4_res = _analyze_selling_context(t4_state, WIKI_PATH)
    t4_passed = (
        t4_res["upsell_decision"] == "NO_UPSELL"
        and t4_res["effective_budget"] == 4000.0
        and t4_res["budget_restrictiveness"] == 1.0
    )
    results.append({
        "test_id": "Test 4",
        "title": "Customer explicitly rejects higher price",
        "input": t4_state["messages"][0].content,
        "expected": "NO_UPSELL & strict boundary cap (Rs 4000)",
        "actual": f"{t4_res['upsell_decision']} (Boundary: Rs {t4_res['effective_budget']})",
        "details": {
            "upsell_decision": t4_res["upsell_decision"],
            "effective_budget": t4_res["effective_budget"],
            "budget_restrictiveness": t4_res["budget_restrictiveness"]
        },
        "passed": t4_passed
    })

    # =========================================================================
    # Test 5: Requested product does not exist -> Expected: No fabricated recommendation
    # =========================================================================
    t5_state = {
        "messages": [HumanMessage(content="I want to buy a flying hoverboard rocket jetpack for Rs 50000.")]
    }
    t5_res = _analyze_selling_context(t5_state, WIKI_PATH)
    t5_passed = (
        len(t5_res["candidate_products"]) == 0
        and t5_res["recommended_product"] is None
    )
    results.append({
        "test_id": "Test 5",
        "title": "Requested product does not exist",
        "input": t5_state["messages"][0].content,
        "expected": "No candidate products & No recommendation (None)",
        "actual": f"Candidates: {len(t5_res['candidate_products'])}, Recommended: {t5_res['recommended_product']}",
        "details": {
            "candidate_count": len(t5_res["candidate_products"]),
            "recommended_product": t5_res["recommended_product"]
        },
        "passed": t5_passed
    })

    # =========================================================================
    # Test 6: Requested product exists with multiple price tiers -> Expected: Catalog-grounded upsell candidate selection
    # =========================================================================
    mock_catalog = [
        {"id": "watch-entry", "name": "Watch Entry", "price": 2000, "category": "watch"},
        {"id": "watch-mid", "name": "Watch Mid Upgrade", "price": 2800, "category": "watch"},
        {"id": "watch-pro", "name": "Watch Pro Ultra", "price": 5000, "category": "watch"},
    ]
    upsell_picked = select_upsell_candidate(mock_catalog, stated_budget=2000, maximum_acceptable_price=3000)
    t6_passed = (
        upsell_picked is not None
        and upsell_picked["id"] == "watch-mid"
        and upsell_picked["price"] == 2800
    )
    results.append({
        "test_id": "Test 6",
        "title": "Requested product exists with multiple price tiers",
        "input": "Stated Budget: 2000, Max Boundary: 3000 across tiers [2000, 2800, 5000]",
        "expected": "watch-mid (Rs 2800)",
        "actual": upsell_picked["id"] if upsell_picked else None,
        "details": {
            "selected_product": upsell_picked
        },
        "passed": t6_passed
    })

    # =========================================================================
    # Test 7: Customer changes budget during conversation -> Expected: State and intent history update
    # =========================================================================
    turn1_state = {
        "messages": [HumanMessage(content="I want a watch under Rs 3000.")],
        "wiki_base_path": WIKI_PATH
    }
    graph = build_intent_analyzer_graph()
    res_turn1 = graph.invoke(turn1_state)
    
    turn2_state = {
        **res_turn1,
        "messages": [
            HumanMessage(content="I want a watch under Rs 3000."),
            AIMessage(content="We have great watches around 3000."),
            HumanMessage(content="Actually, I can increase my budget to Rs 6000.")
        ]
    }
    res_turn2 = graph.invoke(turn2_state)
    t7_passed = (
        res_turn2["stated_budget"] == 6000.0
        and len(res_turn2["intent_history"]) >= 2
    )
    results.append({
        "test_id": "Test 7",
        "title": "Customer changes budget during conversation",
        "input": "Turn 1: Rs 3000 -> Turn 2: Rs 6000",
        "expected": "Stated Budget: 6000, History Length: >= 2",
        "actual": f"Stated Budget: {res_turn2['stated_budget']}, History Length: {len(res_turn2['intent_history'])}",
        "details": {
            "turn1_budget": res_turn1["stated_budget"],
            "turn2_budget": res_turn2["stated_budget"],
            "history_count": len(res_turn2["intent_history"])
        },
        "passed": t7_passed
    })

    # =========================================================================
    # Test 8: Primary product selected + compatible accessory exists -> Expected: Cross-sell suggestion
    # =========================================================================
    candidates_pool = [
        {"id": "iphone-15", "name": "iPhone 15", "price": 70000, "category": "electronics"},
        {"id": "airpods-pro-2", "name": "AirPods Pro 2", "price": 24000, "category": "electronics"},
        {"id": "magsafe-case", "name": "MagSafe Case", "price": 4000, "category": "electronics"},
    ]
    cross_res = decide_cross_sell(
        primary_selected=True,
        candidates=[c for c in candidates_pool if c["id"] != "iphone-15"],
        previously_shown=[],
        rejected=False
    )
    t8_passed = (
        len(cross_res) > 0
        and cross_res[0]["id"] in ("airpods-pro-2", "magsafe-case")
    )
    results.append({
        "test_id": "Test 8",
        "title": "Primary product selected + compatible accessory exists",
        "input": "Primary selected: iPhone 15, Available: AirPods, MagSafe Case",
        "expected": "Cross-sell suggestions offered (AirPods Pro 2 / MagSafe Case)",
        "actual": [c["name"] for c in cross_res],
        "details": {
            "cross_sell_count": len(cross_res),
            "suggestions": [c["id"] for c in cross_res]
        },
        "passed": t8_passed
    })

    # =========================================================================
    # Test 9: No complementary product exists -> Expected: No cross-sell
    # =========================================================================
    empty_cross = decide_cross_sell(
        primary_selected=True,
        candidates=[],
        previously_shown=[],
        rejected=False
    )
    t9_passed = len(empty_cross) == 0
    results.append({
        "test_id": "Test 9",
        "title": "No complementary product exists",
        "input": "Primary selected: True, Candidates: []",
        "expected": "No cross-sell (empty list)",
        "actual": empty_cross,
        "details": {
            "cross_sell_count": len(empty_cross)
        },
        "passed": t9_passed
    })

    # =========================================================================
    # Test 10: Customer rejects cross-sell -> Expected: Do not repeatedly offer the same accessory
    # =========================================================================
    rejected_cross = decide_cross_sell(
        primary_selected=True,
        candidates=candidates_pool,
        previously_shown=["airpods-pro-2"],
        rejected=True
    )
    not_repeated_cross = decide_cross_sell(
        primary_selected=True,
        candidates=candidates_pool,
        previously_shown=["airpods-pro-2", "magsafe-case", "iphone-15"],
        rejected=False
    )
    t10_passed = (len(rejected_cross) == 0) and (len(not_repeated_cross) == 0)
    results.append({
        "test_id": "Test 10",
        "title": "Customer rejects cross-sell / already shown",
        "input": "Case A: rejected=True, Case B: previously_shown=all items",
        "expected": "No repeated offers / Empty list on rejection",
        "actual": f"Rejected count: {len(rejected_cross)}, Already shown count: {len(not_repeated_cross)}",
        "details": {
            "rejected_result": rejected_cross,
            "not_repeated_result": not_repeated_cross
        },
        "passed": t10_passed
    })

    return results

if __name__ == "__main__":
    results = run_test_cases()
    passed_count = sum(1 for r in results if r["passed"])
    total_count = len(results)
    
    print(f"\n=======================================================")
    print(f"       INTENT ANALYZER TEST SUITE EXECUTION RESULTS    ")
    print(f"=======================================================")
    print(f"Summary: {passed_count}/{total_count} Tests Passed ({(passed_count/total_count)*100:.1f}%)\n")
    
    for r in results:
        status_icon = "[PASS]" if r["passed"] else "[FAIL]"
        print(f"{status_icon} {r['test_id']}: {r['title']}")
        print(f"       Input   : {r['input']}")
        print(f"       Expected: {r['expected']}")
        print(f"       Actual  : {r['actual']}")
        print(f"       Details : {json.dumps(r['details'])}\n")
