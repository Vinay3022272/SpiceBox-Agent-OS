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
    
    # Keep only the last 6 messages to stay well within Groq rate limits while preserving conversation context
    trimmed_messages = messages[-6:] if len(messages) > 6 else messages

    state: CommerceState = {
        "messages": trimmed_messages,
        "merchant_id": merchant_id,
        "user_id": user_id,
        "cart": get_cart_data()
    }
    
    result = workflow.invoke(state)

    # Guarantee: If user asked for checkout or payment, ensure the Payment QR code is displayed in chat
    last_user_msg = ""
    for m in reversed(messages):
        if isinstance(m, HumanMessage) or getattr(m, "type", "") == "human":
            last_user_msg = m.content.lower()
            break

    checkout_keywords = ["checkout", "proceed to checkout", "pay", "payment qr", "qr code", "generate qr", "buy now", "pay now", "bill"]
    if any(k in last_user_msg for k in checkout_keywords):
        last_ai_msg = result["messages"][-1] if result.get("messages") else None
        if last_ai_msg and "![Payment QR Code]" not in getattr(last_ai_msg, "content", ""):
            from .utils.cart import create_payment_qr
            qr_res = create_payment_qr(amount_inr=0.0)
            if qr_res.get("success"):
                qr_block = (
                    f"\n\n### 🧾 Payment & Checkout Summary\n\n"
                    f"- **Total Amount Due**: ₹{qr_res['amount_inr']:,.2f} INR\n"
                    f"- **Payment Method**: UPI / Razorpay Direct Pay\n\n"
                    f"![Payment QR Code]({qr_res['qr_data_url']})\n\n"
                    f"📱 **Scan the QR code above with any UPI app (Google Pay, PhonePe, Paytm) to complete payment.**\n\n"
                    f"Or click here to open payment: [{qr_res['payment_url']}]({qr_res['payment_url']})"
                )
                last_ai_msg.content += qr_block

    return result


__all__ = [
    "build_merchant_graph",
    "invoke_merchant_agent",
    "CommerceState",
    "CartState",
]
