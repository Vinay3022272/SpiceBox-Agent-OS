"""
llm.py — LLM client & system prompt helper for the Merchant Commerce Agent.
"""

import os
from pathlib import Path
from typing import Any, Optional
from dotenv import load_dotenv

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


def get_merchant_llm(
    provider: Optional[str] = None,
    model: Optional[str] = None,
    temperature: float = 0.0,
    base_url: str = "http://127.0.0.1:11434"
) -> Any:
    """
    Instantiate ChatGroq or ChatOllama model instance with environment check.
    """
    chosen_provider = provider or os.getenv("LLM_PROVIDER", "groq").lower()

    if chosen_provider == "ollama":
        try:
            from langchain_ollama import ChatOllama
            ollama_model = model or os.getenv("OLLAMA_MODEL", "gpt-oss:120b-cloud")
            return ChatOllama(
                model=ollama_model,
                base_url=os.getenv("OLLAMA_BASE_URL", base_url),
                temperature=temperature
            )
        except ImportError:
            print("Warning: langchain_ollama not installed, falling back to ChatGroq.")

    from langchain_groq import ChatGroq
    groq_model = model or os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")
    api_key = os.getenv("GROQ_API_KEY")
    if not api_key:
        print("Warning: GROQ_API_KEY environment variable is missing.")

    return ChatGroq(
        model=groq_model,
        temperature=temperature
    )

