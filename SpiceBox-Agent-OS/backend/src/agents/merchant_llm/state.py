"""
state.py — Central state definition for the Merchant Commerce Agent (merchant_llm).

Defines the structure of CommerceState which flows through the LangGraph execution steps.
"""

from typing import TypedDict, Annotated, List, Dict, Any, Optional
from langgraph.graph.message import add_messages


class CartItem(TypedDict):
    """Schema for a single item in the customer's cart."""
    product_id: str
    name: str
    price: float
    quantity: int


class CartState(TypedDict):
    """Schema for the overall cart container."""
    items: List[CartItem]
    total: float
    item_count: int


class CommerceState(TypedDict, total=False):
    """
    Central state object for the Merchant Commerce Agent.
    
    Attributes:
        messages: Conversation history, merged using LangGraph's add_messages.
        cart: Current dynamic shopping cart state.
        merchant_id: Unique merchant store identifier.
        user_id: Customer/session identifier.
        payment_context: Metadata regarding active checkout or payment options.
        policy_context: Metadata regarding shipping, returns, or store policies.
    """
    messages: Annotated[List[Any], add_messages]
    cart: CartState
    merchant_id: str
    user_id: str
    payment_context: Dict[str, Any]
    policy_context: Dict[str, Any]
