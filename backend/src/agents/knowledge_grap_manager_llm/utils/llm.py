"""
llm.py — Google Gemini wrapper for the wiki agent.

Provides:
  - call_llm()       → plain text response
  - call_llm_json()  → structured JSON response
  - get_schema()     → reads schema.md for system prompt context

Includes automatic rate-limiting and retry logic for free-tier quotas.
"""

import os
import json
import time
from pathlib import Path
from dotenv import load_dotenv
from groq import Groq

# Load .env from backend directory
_env_paths = [
    Path(__file__).resolve().parents[4] / ".env",   # backend/.env
    Path(__file__).resolve().parents[5] / ".env",    # project root/.env
]
for _ep in _env_paths:
    if _ep.exists():
        load_dotenv(str(_ep))
        break



# Rate limiting: Gemini free tier = 5 requests/minute
_last_call_time: float = 0
_MIN_INTERVAL: float = 2.0  


def _rate_limit():
    """Enforce minimum interval between API calls."""
    global _last_call_time
    now = time.time()
    elapsed = now - _last_call_time
    if elapsed < _MIN_INTERVAL:
        wait = _MIN_INTERVAL - elapsed
        print(f"    ⏳ Rate limit: waiting {wait:.1f}s...")
        time.sleep(wait)
    _last_call_time = time.time()

_client = None

def _get_client():
    global _client

    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            raise ValueError("GROQ_API_KEY not found")

        _client = Groq(api_key=api_key)

    return _client


def get_schema() -> str:
    """
    Read schema.md — the agent's constitution.
    This is prepended to every LLM call as system context.
    """
    schema_path = Path(__file__).resolve().parent.parent / "schema.md"
    if schema_path.exists():
        return schema_path.read_text(encoding="utf-8")
    return ""


def _call_with_retry(fn, max_retries: int = 3):
    """Call a function with retry on rate limit (429) errors."""
    for attempt in range(max_retries):
        try:
            _rate_limit()
            return fn()
        except Exception as e:
            error_str = str(e)
            if "429" in error_str or "RESOURCE_EXHAUSTED" in error_str:
                wait = 30 * (attempt + 1)
                print(f"    ⏳ Rate limited (attempt {attempt+1}/{max_retries}), waiting {wait}s...")
                time.sleep(wait)
            elif "503" in error_str or "UNAVAILABLE" in error_str:
                wait = 15 * (attempt + 1)
                print(f"    ⏳ Service unavailable (attempt {attempt+1}/{max_retries}), waiting {wait}s...")
                time.sleep(wait)
            else:
                raise
    # Final attempt without catching
    _rate_limit()
    return fn()


def call_llm(
    prompt: str,
    system: str | None = None,
    model: str = "openai/gpt-oss-120b",
    temperature: float = 0.3,
    max_tokens: int = 4096,
    include_schema: bool = True,
) -> str:

    client = _get_client()

    system_parts = []

    if include_schema:
        schema = get_schema()
        if schema:
            system_parts.append(schema)

    if system:
        system_parts.append(system)

    system_prompt = "\n\n---\n\n".join(system_parts)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=temperature,
        max_tokens=max_tokens,
    )

    return response.choices[0].message.content.strip()

def call_llm_json(
    prompt: str,
    system: str | None = None,
    model: str = "openai/gpt-oss-120b",
    temperature: float = 0.2,
    max_tokens: int = 4096,
    include_schema: bool = True,
) -> dict | list:

    client = _get_client()

    system_parts = []

    if include_schema:
        schema = get_schema()
        if schema:
            system_parts.append(schema)

    if system:
        system_parts.append(system)

    system_parts.append(
        "You must respond with valid JSON only. "
        "No markdown fences, no explanation outside JSON."
    )

    system_prompt = "\n\n---\n\n".join(system_parts)

    response = client.chat.completions.create(
        model=model,
        messages=[
            {
                "role": "system",
                "content": system_prompt
            },
            {
                "role": "user",
                "content": prompt
            }
        ],
        temperature=temperature,
        max_tokens=max_tokens,
        response_format={"type": "json_object"},
    )

    text = response.choices[0].message.content.strip()

    return json.loads(text)