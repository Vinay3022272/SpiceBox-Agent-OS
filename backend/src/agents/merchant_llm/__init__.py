"""
Merchant Commerce Agent (merchant_llm) package.

Provides an agentic e-commerce selling and upselling AI assistant powered by LangGraph.
"""

from typing import Dict, Any, List
from langchain_core.messages import BaseMessage, HumanMessage

from .state import CommerceState, CartState
from .graph import build_merchant_graph
from .utils.cart import get_cart_data


def invoke_merchant_agent(
    messages: List[BaseMessage],
    merchant_id: str = "23CE10086",
    user_id: str = "customer_default"
) -> Dict[str, Any]:
    """
    Convenience wrapper to invoke the merchant commerce agent graph.

    Args:
        messages: List of conversation messages (e.g. [HumanMessage(content="...")]).
        merchant_id: Unique store/merchant ID.
        user_id: Customer session ID.

    Returns:
        Graph invocation result containing updated messages list and cart state.
    """
    workflow = build_merchant_graph()
    
    state: CommerceState = {
        "messages": messages,
        "merchant_id": merchant_id,
        "user_id": user_id,
        "cart": get_cart_data()
    }
    
    return workflow.invoke(state)


__all__ = [
    "build_merchant_graph",
    "invoke_merchant_agent",
    "CommerceState",
    "CartState",
]
