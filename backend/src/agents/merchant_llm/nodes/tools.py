"""
tools.py — LangChain commerce tools for the Merchant Commerce Agent.
"""

import os
from pathlib import Path
from typing import Dict, Any
from langchain_core.tools import tool

from ..utils.cart import (
    add_item_to_cart,
    get_cart_data,
    remove_item_from_cart,
    clear_cart_data,
)
from ...store_manager_llm import query_knowledge_base, query_marketing_intelligence


# Resolve backend root path: .../backend (5 levels up from tools.py)
_BACKEND_DIR = Path(__file__).resolve().parents[4]
_DEFAULT_WIKI_PATH = str(_BACKEND_DIR / "merchant_knowledge")


@tool
def add_to_cart(product_id: str, quantity: int = 1, name: str = "", price: float = 0.0) -> Dict[str, Any]:
    """
    Add a product to the customer's shopping cart. Call this IMMEDIATELY whenever the customer requests to add an item or purchase a product.

    Args:
        product_id: Product ID, slug, or name (e.g. 'iphone-15', 'airpods-4', 'iPhone 15', 'AirPods 4').
        quantity: Number of units to add (default is 1).
        name: Optional display name of the product.
        price: Optional item price if known.
    """
    return add_item_to_cart(product_id=product_id, quantity=quantity, name=name, price=price)


@tool
def get_cart() -> Dict[str, Any]:
    """
    Get the customer's current shopping cart, item list, item count, and total price.
    """
    return get_cart_data()


@tool
def remove_from_cart(product_id: str) -> Dict[str, Any]:
    """
    Remove an item from the customer's shopping cart matching product_id or product name.

    Args:
        product_id: Product ID or name to remove (e.g. 'airpods-4', 'iPhone 15').
    """
    return remove_item_from_cart(product_id=product_id)


@tool
def clear_cart() -> Dict[str, Any]:
    """
    Clear all items from the customer's shopping cart.
    """
    return clear_cart_data()


@tool
def get_product_catalog(query: str, merchant_id: str = "23CE10086") -> str:
    """
    Search or query the store's product catalog (product names, specs, prices, categories, and reviews).
    Use this to look up product information, find product IDs, check prices, or verify availability.

    Args:
        query: The natural language search query (e.g. 'What items are available in your shop?' or 'Price of iPhone 15').
        merchant_id: Unique merchant store ID.
    """
    result = query_knowledge_base(
        query=query,
        wiki_base_path=_DEFAULT_WIKI_PATH,
        merchant_id=merchant_id
    )
    return result.get("answer", "No product catalog data found.")


@tool
def get_upsell_products(product_id: str, merchant_id: str = "23CE10086") -> str:
    """
    Find complementary products, upsell opportunities, accessory recommendations, or promotional deals
    related to a given product_id or category.

    Args:
        product_id: Product ID or category name to find recommendations for (e.g. 'iphone-15', 'smartphones').
        merchant_id: Unique merchant store ID.
    """
    query = f"What complementary accessories, protection items, discounts, or upsell recommendations exist for {product_id}?"
    result = query_marketing_intelligence(
        query=query,
        wiki_base_path=_DEFAULT_WIKI_PATH,
        merchant_id=merchant_id
    )
    return result.get("answer", "No upsell recommendations found.")


all_tools = [
    add_to_cart,
    get_cart,
    remove_from_cart,
    clear_cart,
    get_product_catalog,
    get_upsell_products,
]
