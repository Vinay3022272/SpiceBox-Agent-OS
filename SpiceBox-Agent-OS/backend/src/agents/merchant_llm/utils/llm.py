import os
from pathlib import Path
from dotenv import load_dotenv
from langchain_ollama import ChatOllama
from langchain_groq import ChatGroq

# Ensure .env is loaded from backend directory (5 levels up from utils/llm.py)
_backend_dir = Path(__file__).resolve().parents[4]  # backend/
_env_path = _backend_dir / ".env"
if _env_path.exists():
    load_dotenv(str(_env_path))

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434")

# Primary Ollama models
OLLAMA_MODELS = [
    "gpt-oss:120b-cloud",
    "gpt-oss:20b-cloud",
]

# Secondary Groq backup models
GROQ_MODELS = [
    "openai/gpt-oss-20b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "qwen/qwen3.8-27b",
]


def get_system_prompt() -> str:
    """
    Read schema.md — system constitution for merchant_llm.
    """
    schema_path = Path(__file__).resolve().parent.parent / "schema.md"
    if schema_path.exists():
        return schema_path.read_text(encoding="utf-8")
    return "You are the Merchant Commerce Agent assisting customers with purchases and product information."


def get_merchant_llm(model: str = "gpt-oss:120b-cloud", temperature: float = 0.0):
    """
    Instantiate ChatOllama (or ChatGroq fallback) model instance.
    """
    try:
        return ChatOllama(
            base_url=OLLAMA_BASE_URL,
            model=model,
            temperature=temperature,
        )
    except Exception:
        return ChatGroq(
            model="openai/gpt-oss-20b",
            temperature=temperature,
            max_retries=1,
        )


def get_resilient_merchant_llm(tools: list, temperature: float = 0.0):
    """
    Build a multi-model fallback chain bound with tools.
    Prioritizes Ollama models (no TPM/TPD rate limits) with secondary Groq fallbacks.
    """
    bound_models = []

    # 1. Ollama models
    for m in OLLAMA_MODELS:
        try:
            bound_models.append(
                ChatOllama(
                    base_url=OLLAMA_BASE_URL,
                    model=m,
                    temperature=temperature,
                ).bind_tools(tools)
            )
        except Exception as e:
            print(f"Warning: could not bind Ollama model {m}: {e}")

    # 2. Groq models as secondary backup
    api_key = os.getenv("GROQ_API_KEY")
    if api_key:
        for m in GROQ_MODELS:
            try:
                bound_models.append(
                    ChatGroq(model=m, temperature=temperature, max_retries=0).bind_tools(tools)
                )
            except Exception as e:
                print(f"Warning: could not bind Groq model {m}: {e}")

    if not bound_models:
        raise RuntimeError("No LLM models could be bound with tools.")

    if len(bound_models) == 1:
        return bound_models[0]

    return bound_models[0].with_fallbacks(bound_models[1:])
