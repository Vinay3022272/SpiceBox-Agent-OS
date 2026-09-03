"""
test_merchant_agent.py — End-to-end verification script for merchant_llm agent.
"""

import os
import sys
from pathlib import Path
from langchain_core.messages import HumanMessage

# Force UTF-8 output encoding for Windows terminal compatibility
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend root is on sys.path
_backend_root = str(Path(__file__).resolve().parents[4])
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

from src.agents.merchant_llm import build_merchant_graph
from src.agents.merchant_llm.utils.cart import get_cart_data, clear_cart_data


def test_merchant_flow():
    print("Initializing Merchant Commerce Agent workflow...")
    workflow = build_merchant_graph()
    clear_cart_data()

    messages = []

    # Step 1: Query catalog items
    print("\n--- Test 1: Selling (Catalog Inquiry) ---")
    query1 = "what are the items available in your shop?"
    print(f"Customer: {query1}")
    messages.append(HumanMessage(content=query1))
    
    res1 = workflow.invoke({"messages": messages})
    messages = res1["messages"]
    print(f"Agent: {messages[-1].content}\n")

    # Step 2: Customer expresses interest in iPhone 15
    print("\n--- Test 2: Selling + Upselling ---")
    query2 = "I want to buy the iPhone 15. What accessories do you suggest for it?"
    print(f"Customer: {query2}")
    messages.append(HumanMessage(content=query2))
    
    res2 = workflow.invoke({"messages": messages})
    messages = res2["messages"]
    print(f"Agent: {messages[-1].content}\n")

    # Step 3: Customer requests adding item to cart
    print("\n--- Test 3: Cart Addition ---")
    query3 = "Add the iPhone 15 and AirPods 4 to my cart."
    print(f"Customer: {query3}")
    messages.append(HumanMessage(content=query3))
    
    res3 = workflow.invoke({"messages": messages})
    messages = res3["messages"]
    print(f"Agent: {messages[-1].content}\n")

    # Step 4: Verify Cart Data
    cart = get_cart_data()
    print(f"--- Cart Verification ---")
    print(f"Items in Cart: {cart['items']}")
    print(f"Total Item Count: {cart['item_count']}")
    print(f"Total Cart Value: ₹{cart['total']}")
    
    assert cart["item_count"] > 0, "Cart should contain items!"
    print("\n✅ End-to-end verification completed successfully!")


if __name__ == "__main__":
    test_merchant_flow()
