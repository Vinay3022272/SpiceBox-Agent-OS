"""
llm.py — LLM client & system prompt helper for the Merchant Commerce Agent.
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


def get_system_prompt() -> str:
    """
    Read schema.md — system constitution for merchant_llm.
    """
    schema_path = Path(__file__).resolve().parent.parent / "schema.md"
    if schema_path.exists():
        return schema_path.read_text(encoding="utf-8")
    return "You are the Merchant Commerce Agent assisting customers with purchases and product information."


def get_merchant_llm(model: str = "openai/gpt-oss-120b", temperature: float = 0.0) -> ChatGroq:
    """
    Instantiate ChatGroq model instance with environment key check.
    """
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Warning: GROQ_API_KEY environment variable is missing.")

    return ChatGroq(
        model=model,
        temperature=temperature
    )
