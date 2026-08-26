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
from google import genai

# Load .env from backend directory
_env_paths = [
    Path(__file__).resolve().parents[4] / ".env",   # backend/.env
    Path(__file__).resolve().parents[5] / ".env",    # project root/.env
]
for _ep in _env_paths:
    if _ep.exists():
        load_dotenv(str(_ep))
        break

_client: genai.Client | None = None

# Rate limiting: Gemini free tier = 5 requests/minute
_last_call_time: float = 0
_MIN_INTERVAL: float = 13.0  # ~4.6 req/min to stay safe


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


def _get_client() -> genai.Client:
    """Lazy-init Gemini client."""
    global _client
    if _client is None:
        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY not found in environment variables")
        _client = genai.Client(api_key=api_key)
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
    model: str = "gemini-3.6-flash",
    temperature: float = 0.3,
    max_tokens: int = 4096,
    include_schema: bool = True,
) -> str:
    """
    Call Gemini with a plain text prompt. Returns the text response.

    If include_schema is True, schema.md is prepended to the system prompt.
    Includes automatic rate limiting and retry on 429/503 errors.
    """
    client = _get_client()

    system_parts = []
    if include_schema:
        schema = get_schema()
        if schema:
            system_parts.append(schema)
    if system:
        system_parts.append(system)

    system_prompt = "\n\n---\n\n".join(system_parts) if system_parts else "You are a helpful assistant."

    def _do_call():
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
                max_output_tokens=max_tokens,
            ),
        )
        return response.text.strip()

    return _call_with_retry(_do_call)


def call_llm_json(
    prompt: str,
    system: str | None = None,
    model: str = "gemini-3.6-flash",
    temperature: float = 0.2,
    max_tokens: int = 4096,
    include_schema: bool = True,
) -> dict | list:
    """
    Call Gemini with JSON output. Returns parsed JSON.

    The prompt MUST instruct the model to return JSON.
    Includes automatic rate limiting and retry on 429/503 errors.
    """
    client = _get_client()

    system_parts = []
    if include_schema:
        schema = get_schema()
        if schema:
            system_parts.append(schema)
    if system:
        system_parts.append(system)

    system_parts.append("You must respond with valid JSON only. No markdown fences, no explanation outside JSON.")
    system_prompt = "\n\n---\n\n".join(system_parts)

    def _do_call():
        response = client.models.generate_content(
            model=model,
            contents=prompt,
            config=genai.types.GenerateContentConfig(
                system_instruction=system_prompt,
                temperature=temperature,
                max_output_tokens=max_tokens,
                response_mime_type="application/json",
            ),
        )
        text = response.text.strip()

        try:
            return json.loads(text)
        except json.JSONDecodeError:
            # Try to extract JSON from markdown fences
            if "```json" in text:
                text = text.split("```json")[1].split("```")[0].strip()
            elif "```" in text:
                text = text.split("```")[1].split("```")[0].strip()
            return json.loads(text)

    return _call_with_retry(_do_call)
