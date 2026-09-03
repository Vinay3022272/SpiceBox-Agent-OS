"""
__main__.py — Interactive CLI runner for the Merchant Commerce Agent.

Usage:
  python -m src.agents.merchant_llm
"""

import sys
import os
from pathlib import Path
from langchain_core.messages import HumanMessage

# Ensure backend root is on sys.path
_backend_root = str(Path(__file__).resolve().parents[3])
if _backend_root not in sys.path:
    sys.path.insert(0, _backend_root)

from src.agents.merchant_llm import build_merchant_graph
from src.agents.merchant_llm.utils.cart import get_cart_data


def main():
    print("=" * 60)
    print("   🛒 Merchant Commerce Agent (Selling + Upselling)   ")
    print("=" * 60)
    print("Type your message below. Type 'exit' or 'quit' to quit.\n")

    workflow = build_merchant_graph()
    messages = []

    while True:
        try:
            user_input = input("\nCustomer: ").strip()
            if not user_input:
                continue

            if user_input.lower() in ["exit", "quit"]:
                print("\nThank you for visiting! Goodbye.")
                break

            messages.append(HumanMessage(content=user_input))

            print("\nAgent is thinking...")
            result = workflow.invoke({"messages": messages})

            messages = result.get("messages", [])
            last_message = messages[-1]

            print(f"\nAgent: {last_message.content}")

            current_cart = get_cart_data()
            if current_cart["items"]:
                print(f"\n[Cart Summary: {current_cart['item_count']} items | Total: ₹{current_cart['total']}]")

        except KeyboardInterrupt:
            print("\nSession ended.")
            break
        except Exception as e:
            print(f"\nError: {e}")


if __name__ == "__main__":
    main()
