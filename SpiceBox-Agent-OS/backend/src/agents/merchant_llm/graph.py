"""
graph.py — LangGraph state graph definition for the Merchant Commerce Agent.
"""

from langgraph.graph import StateGraph, START, END
from langgraph.prebuilt import ToolNode, tools_condition

from .state import CommerceState
from .nodes.merchant_llm import merchant_llm_node
from .nodes.selling_context import selling_context_node
from .nodes.tools import all_tools


def build_merchant_graph():
    """
    Construct and compile the merchant_llm StateGraph.

    Returns:
        CompiledStateGraph ready to be invoked with state dictionaries.
    """
    graph = StateGraph(CommerceState)

    # Add nodes
    graph.add_node("selling_context", selling_context_node)
    graph.add_node("merchant_llm", merchant_llm_node)
    graph.add_node("tools", ToolNode(all_tools))

    # Add edges
    # Build catalog-grounded, deterministic selling guidance once per user turn.
    # Tool loops intentionally return directly to merchant_llm, avoiding duplicate analysis.
    graph.add_edge(START, "selling_context")
    graph.add_edge("selling_context", "merchant_llm")
    graph.add_conditional_edges("merchant_llm", tools_condition)
    graph.add_edge("tools", "merchant_llm")

    return graph.compile()
