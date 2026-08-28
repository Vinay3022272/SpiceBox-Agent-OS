"""
merchant_llm.py — Core LLM decision node for the Merchant Commerce Agent.
"""

from typing import Dict, Any, List
from langchain_core.messages import SystemMessage

from ..state import CommerceState
from ..utils.llm import get_merchant_llm, get_system_prompt
from .tools import all_tools


def merchant_llm_node(state: CommerceState) -> Dict[str, Any]:
    """
    Main LangGraph node that processes incoming conversation messages,
    attaches system constitution prompt from schema.md, binds tools,
    and returns LLM response.
    """
    messages = state.get("messages", [])
    system_content = get_system_prompt()
    
    system_message = SystemMessage(content=system_content)

    llm = get_merchant_llm()
    llm_with_tools = llm.bind_tools(all_tools)

    response = llm_with_tools.invoke([system_message] + list(messages))

    return {
        "messages": [response]
    }
