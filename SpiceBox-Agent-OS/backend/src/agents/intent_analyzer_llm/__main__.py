"""Interactive CLI for the Intent Analyzer Agent.

Usage: python -m src.agents.intent_analyzer_llm
"""

import sys
from pathlib import Path

from langchain_core.messages import HumanMessage

_BACKEND_ROOT = str(Path(__file__).resolve().parents[3])
if _BACKEND_ROOT not in sys.path:
    sys.path.insert(0, _BACKEND_ROOT)

from src.agents.intent_analyzer_llm.graph import build_intent_analyzer_graph


def main():
    graph = build_intent_analyzer_graph()
    wiki_path = str(Path(__file__).resolve().parents[3] / "merchant_knowledge")
    print("Intent Analyzer Agent — enter a customer message; type exit to quit.")
    while True:
        message = input("Customer: ").strip()
        if message.lower() in {"exit", "quit"}:
            return
        if message:
            result = graph.invoke({"messages": [HumanMessage(content=message)], "wiki_base_path": wiki_path})
            print({key: result.get(key) for key in ("stated_budget", "effective_budget", "upsell_decision", "recommended_product")})


if __name__ == "__main__":
    main()
