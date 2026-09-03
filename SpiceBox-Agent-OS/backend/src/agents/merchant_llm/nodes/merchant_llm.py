"""
merchant_llm.py — Core LLM decision node for the Merchant Commerce Agent.
Uses resilient multi-model fallback chain to survive rate limits.
"""

from typing import Dict, Any, List
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
    system_message = SystemMessage(content=system_content)

    resilient_llm = get_resilient_merchant_llm(tools=all_tools)
    response = resilient_llm.invoke([system_message] + list(messages))

    return {
        "messages": [response]
    }
