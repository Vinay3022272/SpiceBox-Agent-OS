"""
llm.py — LLM wrapper for the wiki agent using Groq.

Provides:
  - call_llm()       -> plain text response
  - call_llm_json()  -> structured JSON response
  - get_schema()     -> reads schema.md for system prompt context

Includes automatic rate-limiting, retry logic, and fallback models.
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
    Path(__file__).resolve().parents[5] / ".env",   # project root/.env
]
for _ep in _env_paths:
    if _ep.exists():
        load_dotenv(str(_ep))
        break

# Rate limiting
_last_call_time: float = 0
_MIN_INTERVAL: float = 1.0  

DEFAULT_MODELS = [
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-120b",
    "qwen/qwen3.6-27b",
    "openai/gpt-oss-20b",
]


def _rate_limit():
    """Enforce minimum interval between API calls."""
    global _last_call_time
    now = time.time()
    elapsed = now - _last_call_time
    if elapsed < _MIN_INTERVAL:
        wait = _MIN_INTERVAL - elapsed
        time.sleep(wait)
    _last_call_time = time.time()

_client = None

def _get_client():
    global _client

    if _client is None:
        api_key = os.getenv("GROQ_API_KEY")

        if not api_key:
            raise ValueError("GROQ_API_KEY not found in environment")

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


def call_llm(
    prompt: str,
    system: str | None = None,
    model: str = "qwen/qwen3.8-27b",
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

    models_to_try = [model] + [m for m in DEFAULT_MODELS if m != model]

    last_error = None
    for cur_model in models_to_try:
        for attempt in range(3):
            try:
                _rate_limit()
                response = client.chat.completions.create(
                    model=cur_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt},
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                )
                return response.choices[0].message.content or ""
            except Exception as e:
                last_error = e
                err_str = str(e)
                if "429" in err_str or "rate_limit" in err_str:
                    print(f"    [Rate limit] Switching from {cur_model} to fallback model...")
                    break  # Break attempt loop to switch model immediately
                elif attempt < 2:
                    time.sleep(2)

    raise last_error


def call_llm_json(
    prompt: str,
    system: str | None = None,
    model: str = "qwen/qwen3.8-27b",
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

    models_to_try = [model] + [m for m in DEFAULT_MODELS if m != model]

    last_error = None
    for cur_model in models_to_try:
        for attempt in range(3):
            try:
                _rate_limit()
                response = client.chat.completions.create(
                    model=cur_model,
                    messages=[
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": prompt}
                    ],
                    temperature=temperature,
                    max_tokens=max_tokens,
                    response_format={"type": "json_object"},
                )
                text = response.choices[0].message.content.strip()
                return json.loads(text)
            except Exception as e:
                last_error = e
                err_str = str(e)
                if "429" in err_str or "rate_limit" in err_str:
                    if "tokens per day" in err_str or "TPD" in err_str:
                        print(f"    [Model Rate Limit] Switching from {cur_model} to fallback model...")
                        break
                    wait = 5 * (attempt + 1)
                    print(f"    [Rate limit] Waiting {wait}s on {cur_model}...")
                    time.sleep(wait)
                else:
                    break

    raise last_error