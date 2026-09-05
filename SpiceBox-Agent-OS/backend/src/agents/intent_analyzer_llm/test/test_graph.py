import os
from pathlib import Path

from langchain_core.messages import HumanMessage

from ..graph import build_intent_analyzer_graph


os.environ["INTENT_ANALYZER_LLM"] = "false"
WIKI_PATH = str(Path(__file__).resolve().parents[4] / "merchant_knowledge")


def test_intent_graph_returns_policy_fields():
    graph = build_intent_analyzer_graph()
    result = graph.invoke({
        "messages": [HumanMessage(content="I need a phone around Rs 25000 and can stretch Rs 1000 for quality.")],
        "wiki_base_path": WIKI_PATH,
    })
    assert result["stated_budget"] == 25000
    assert result["effective_budget"] == 26000
    assert result["upsell_decision"] in {"SOFT_UPSELL", "ACTIVE_UPSELL"}
