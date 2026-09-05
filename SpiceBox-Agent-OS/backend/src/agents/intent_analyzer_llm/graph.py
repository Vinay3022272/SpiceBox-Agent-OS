"""LangGraph definition for the Intent Analyzer Agent."""

from langgraph.graph import END, START, StateGraph

from .nodes.intent_analyzer import intent_analyzer_node
from .state import IntentAnalysisState


def build_intent_analyzer_graph():
    """Compile the focused one-node intent/candidate/policy subgraph."""
    graph = StateGraph(IntentAnalysisState)
    graph.add_node("intent_analyzer", intent_analyzer_node)
    graph.add_edge(START, "intent_analyzer")
    graph.add_edge("intent_analyzer", END)
    return graph.compile()
