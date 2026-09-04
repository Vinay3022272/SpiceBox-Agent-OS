"""
merchant_llm.py — Core LLM decision node for the Merchant Commerce Agent.
Uses resilient multi-model fallback chain to survive rate limits.
"""

from typing import Dict, Any, List
import json
from langchain_core.messages import SystemMessage

from ..state import CommerceState
from ..utils.llm import get_resilient_merchant_llm, get_system_prompt
from .tools import all_tools


def merchant_llm_node(state: CommerceState) -> Dict[str, Any]:
    """
    Main LangGraph node that processes incoming conversation messages,
    attaches system constitution prompt from schema.md, binds tools with
    automatic model fallbacks, and returns LLM response.
    """
    messages = state.get("messages", [])
    system_content = get_system_prompt()
    selling_context = {
        "product_need": state.get("product_need"),
        "catalog_candidates": state.get("candidate_products", []),
        "stated_budget": state.get("stated_budget"),
        "maximum_acceptable_price": state.get("effective_budget"),
        "acceptable_budget_stretch": state.get("acceptable_budget_stretch"),
        "intent_signals": {
            "budget_restrictiveness": state.get("budget_restrictiveness"),
            "quality_value_orientation": state.get("quality_value_orientation"),
            "upsell_openness": state.get("upsell_openness"),
            "confidence": state.get("intent_confidence"),
            "evidence": state.get("intent_evidence", {}),
        },
        "policy_decision": state.get("upsell_decision"),
        "recommended_upgrade": state.get("recommended_product"),
        "cross_sell_candidates": state.get("cross_sell_candidates", []),
        "questions_already_asked": state.get("questions_asked", 0),
        "cart": state.get("cart"),
    }
    system_content += (
        "\n\nINTENT-AWARE SELLING CONTEXT (trusted internal policy data):\n"
        + json.dumps(selling_context, ensure_ascii=False, default=str)
        + "\n\nCRITICAL DIRECTIVES FOR PRODUCT PRESENTATION:\n"
        "1. When the customer asks for a category or products (e.g. 'I need a watch', 'show me phones', 'what do you have'): "
        "YOU MUST EXPLICITLY LIST 2 to 4 matching options from catalog_candidates right in your response with their exact Name, Price in INR (₹), and 1-line key highlight. "
        "NEVER say 'We have options available' without actually listing them in bullet points!\n"
        "2. State catalog facts ONLY from catalog_candidates or tool results. Never invent names, prices, or specs.\n"
        "3. Do not push products priced above maximum_acceptable_price.\n"
        "4. When upselling, if recommended_upgrade is provided, mention it as a premium option; if recommended_upgrade is null, simply present the best matching catalog_candidates.\n"
        "5. Ask at most three natural clarification questions across the conversation. Initial greeting exchanges (e.g. 'Hi') do not count.\n"
        "6. Cross-sell accessories only AFTER the customer selects or confirms a primary product.\n"
        "7. CHECKOUT PROTOCOL (MANDATORY SEQUENCE): When the customer asks to checkout or pay, check if a shipping address is already saved. "
        "If NO shipping address is saved, you MUST ask for their delivery details (Full Name, Street Address, City, PIN code, Phone, and Email) FIRST and DO NOT call generate_payment_qr yet! "
        "Only call generate_payment_qr AFTER the customer's delivery address is provided and saved with set_shipping_address.\n"
        "8. Respond warmly in English only."
    )
    system_message = SystemMessage(content=system_content)

    resilient_llm = get_resilient_merchant_llm(tools=all_tools)
    response = resilient_llm.invoke([system_message] + list(messages))

    return {
        "messages": [response]
    }
