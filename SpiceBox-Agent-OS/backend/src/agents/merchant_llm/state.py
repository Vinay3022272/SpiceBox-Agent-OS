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
    # Intent-aware selling additions. All are optional to preserve older callers.
    product_need: Optional[str]
    customer_preferences: Dict[str, Any]
    catalog_context: List[Dict[str, Any]]
    candidate_products: List[Dict[str, Any]]
    stated_budget: Optional[float]
    effective_budget: Optional[float]
    acceptable_budget_stretch: Optional[float]
    budget_restrictiveness: float
    quality_value_orientation: float
    upsell_openness: float
    upsell_opportunity_score: float
    upsell_decision: str
    intent_confidence: float
    intent_evidence: Dict[str, str]
    intent_history: List[Dict[str, Any]]
    questions_asked: int
    recommended_product: Optional[Dict[str, Any]]
    cross_sell_candidates: List[Dict[str, Any]]
    cross_sell_shown: List[str]
    cross_sell_rejected: bool
    cross_sell_accepted: List[str]
