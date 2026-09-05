from pathlib import Path
import os

from langchain_core.messages import AIMessage, HumanMessage

from ..analyzer import _analyze_selling_context


WIKI_PATH = str(Path(__file__).resolve().parents[3] / "merchant_knowledge")
os.environ["INTENT_ANALYZER_LLM"] = "false"


def _analyze(message: str, extra_messages=None):
    return _analyze_selling_context({"messages": (extra_messages or []) + [HumanMessage(content=message)]}, WIKI_PATH)


def test_hard_budget_is_a_policy_override():
    result = _analyze("I need a phone around Rs 25000, but do not show anything above that price.")
    assert result["upsell_decision"] == "NO_UPSELL"
    assert result["effective_budget"] == 25000


def test_explicit_stretch_is_converted_to_budget_boundary():
    result = _analyze("I need a phone around Rs 25000 and can stretch Rs 1000 for a genuinely better option.")
    assert result["stated_budget"] == 25000
    assert result["effective_budget"] == 26000


def test_unsupported_stretch_is_not_invented():
    result = _analyze("I need a phone around Rs 25000 and may stretch a little for quality.")
    assert result["acceptable_budget_stretch"] is None


def test_unavailable_product_does_not_create_a_catalog_claim():
    result = _analyze("I need a table fan around Rs 500.")
    assert result["candidate_products"] == []


def test_intent_history_is_preserved_across_turns():
    prior = [HumanMessage(content="I need a phone around Rs 25000."), AIMessage(content="Would you consider a small stretch?")]
    result = _analyze_selling_context({"messages": prior + [HumanMessage(content="Yes, I can stretch Rs 1000.")], "intent_history": [{"turn": 1}]}, WIKI_PATH)
    assert len(result["intent_history"]) == 2
    assert result["stated_budget"] == 25000


def test_1_cheapest_product_no_upsell():
    result = _analyze("Show me the cheapest possible phone available around Rs 10000.")
    assert result["upsell_decision"] == "NO_UPSELL"
    assert result["budget_restrictiveness"] >= 0.85


def test_2_flexible_budget_active_upsell():
    result = _analyze("I want a top quality watch, flexible budget and willing to stretch extra Rs 5000 for something genuinely better.")
    assert result["upsell_decision"] in ("ACTIVE_UPSELL", "SOFT_UPSELL")
    assert result["upsell_openness"] >= 0.7


def test_3_quality_and_small_stretch():
    result = _analyze("I need a reliable durable watch around Rs 5000 and can stretch Rs 1000 for better quality.")
    assert result["upsell_decision"] in ("ACTIVE_UPSELL", "SOFT_UPSELL")
    assert result["stated_budget"] == 5000.0
    assert result["effective_budget"] == 6000.0


def test_4_explicitly_rejects_higher_price():
    result = _analyze("I want a watch under Rs 4000. Do not show anything above that price, not a single rupee more.")
    assert result["upsell_decision"] == "NO_UPSELL"
    assert result["effective_budget"] == 4000.0


def test_5_product_does_not_exist():
    result = _analyze("I want to buy a flying hoverboard rocket jetpack for Rs 50000.")
    assert len(result["candidate_products"]) == 0
    assert result["recommended_product"] is None


def test_bonus_hinglish_slang_intent():
    result = _analyze("Mujhe sabse sasta phone chahiye 10000 me.")
    assert result["upsell_decision"] == "NO_UPSELL"


def test_greeting_does_not_count_as_first_clarification_question():
    # Turn 1: User says 'Hi', bot greets with a question mark
    history = [
        HumanMessage(content="Hi"),
        AIMessage(content="Hello! Welcome to our store! How can I help you today?"),
    ]
    turn1_result = _analyze_selling_context({"messages": history}, WIKI_PATH)
    assert turn1_result["questions_asked"] == 0

    # Turn 2: Real inquiry begins, bot asks clarification
    turn2_history = history + [
        HumanMessage(content="I need a sports watch"),
        AIMessage(content="We have Apex Active Pulse at Rs 4999. Do you have a specific budget in mind?"),
    ]
    turn2_result = _analyze_selling_context({"messages": turn2_history}, WIKI_PATH)
    assert turn2_result["questions_asked"] == 1

