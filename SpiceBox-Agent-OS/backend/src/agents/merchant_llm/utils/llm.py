"""
llm.py — LLM client & system prompt helper for the Merchant Commerce Agent.
Includes multi-model fallback chain to safeguard against Groq TPM/TPD rate limits.
"""

import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_groq import ChatGroq

# Ensure .env is loaded from backend directory (5 levels up from utils/llm.py)
_backend_dir = Path(__file__).resolve().parents[4]  # backend/
_env_path = _backend_dir / ".env"
if _env_path.exists():
    load_dotenv(str(_env_path))

DEFAULT_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b",
]


def get_system_prompt() -> str:
    """
    Read schema.md — system constitution for merchant_llm.
    """
    schema_path = Path(__file__).resolve().parent.parent / "schema.md"
    if schema_path.exists():
        return schema_path.read_text(encoding="utf-8")
    return "You are the Merchant Commerce Agent assisting customers with purchases and product information."


def get_merchant_llm(model: str = "qwen/qwen3.8-27b", temperature: float = 0.0) -> ChatGroq:
    """
    Instantiate ChatGroq model instance with environment key check.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Warning: GROQ_API_KEY environment variable is missing.")

    return ChatGroq(
        model=model,
        temperature=temperature,
        max_retries=3,
    )


def get_resilient_merchant_llm(tools: list, temperature: float = 0.0):
    """
    Build a multi-model fallback chain bound with tools.
    If the primary model exhausts rate limits (429 TPM/TPD), it seamlessly
    falls back to secondary and tertiary models with separate token pools.
    """
    bound_models = [
        ChatGroq(model=m, temperature=temperature, max_retries=2).bind_tools(tools)
        for m in DEFAULT_MODELS
    ]
    return bound_models[0].with_fallbacks(bound_models[1:])
