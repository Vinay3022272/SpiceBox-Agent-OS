"""Intent analysis plus catalog-context assembly for the merchant graph.

The language interpretation is conservative and deterministic so it works without
an additional model call.  The ``CustomerIntent`` Pydantic contract keeps this
agent ready for a structured-output LLM provider without making sales policy
dependent on an untrusted model response.
"""

from __future__ import annotations

import logging
import os
import re
from typing import Any, Dict, List, Optional
from rapidfuzz import fuzz

from .policy import calculate_budget_boundary, calculate_upsell_score, decide_cross_sell, decide_upsell, select_upsell_candidate
from .schema import CustomerIntent
from ..knowledge_grap_manager_llm.query_pipeline import (
    extract_category_from_page,
    extract_price_from_page,
    get_all_wiki_pages,
    retrieve_relevant_pages,
)

logger = logging.getLogger(__name__)
_BUDGET = re.compile(r"(?:₹|rs\.?|inr|budget|around|under|within|upto|up to)\s*([\d,]+)", re.I)
_HARD_BUDGET = re.compile(r"(?:not a rupee|one rupee|strict(?:ly)?|fixed|cannot|can't|don't|do not).{0,40}(?:above|over|more|beyond)|(?:above|over|more|beyond).{0,30}(?:not|can't|cannot|strict)", re.I)
_STRETCH = re.compile(r"(?:stretch|extra|more|higher|above).{0,25}?(?:₹|rs\.?|inr)?\s*([\d,]+)", re.I)


_PURE_GREETING = re.compile(
    r"^\s*(hi|hello|hey|heyy|hii|namaste|namaskar|good\s*(morning|afternoon|evening)|hola|howdy|sup|yo)\s*[!.,?]*\s*$",
    re.I
)


def _is_pure_greeting(content: str) -> bool:
    """Return True if message is merely an initial greeting without product requirements or budget."""
    stripped = content.strip().lower()
    if _PURE_GREETING.match(stripped):
        return True
    words = re.findall(r"[a-z]+", stripped)
    greeting_words = {"hi", "hello", "hey", "heyy", "hii", "namaste", "namaskar", "good", "morning", "afternoon", "evening", "hola", "howdy", "sup", "yo"}
    if words and all(w in greeting_words for w in words) and len(words) <= 3:
        return True
    return False


def _count_clarification_questions(messages: List[Any]) -> int:
    """
    Count clarification questions asked by the assistant.
    Guardrail: Excludes AI greeting responses if the preceding user message was merely a greeting.
    The 3-question count strictly starts from the first genuine product/shopping inquiry.
    """
    question_count = 0
    last_user_content = ""
    for msg in messages:
        mtype = getattr(msg, "type", "")
        content = str(getattr(msg, "content", ""))
        if mtype == "human":
            last_user_content = content
        elif mtype == "ai":
            if _is_pure_greeting(last_user_content):
                continue
            question_count += content.count("?")
    return question_count


def _text(messages: List[Any]) -> str:
    return "\n".join(str(getattr(m, "content", "")) for m in messages)


def _latest_customer_message(messages: List[Any]) -> str:
    for message in reversed(messages):
        if getattr(message, "type", "") == "human":
            return str(getattr(message, "content", ""))
    return ""


def _infer_intent(messages: List[Any]) -> CustomerIntent:
    text = _text(messages).lower()
    latest = _latest_customer_message(messages).lower()
    # An amount introduced by "stretch" is an increment, not the customer's
    # total budget (e.g. "₹25k, stretch ₹1k" still means a ₹25k budget).
    budget_text = _STRETCH.sub("", text)
    budgets = [float(m.replace(",", "")) for m in _BUDGET.findall(budget_text)]
    budget = budgets[-1] if budgets else None
    hard = bool(_HARD_BUDGET.search(latest))
    cheap = any(x in text for x in ("cheapest", "cheap", "sasta", "economical", "lowest price"))
    quality = any(x in text for x in ("quality", "durable", "warranty", "reliable", "long-term", "accha", "better"))
    open_to_more = any(x in text for x in ("stretch", "a little more", "extra", "worth it", "genuinely better", "thoda"))
    reject_more = hard or any(x in text for x in ("don't show above", "do not show above", "no upsell", "not interested in accessories"))
    stretch = None
    stretch_match = _STRETCH.search(latest)
    if budget and stretch_match and not hard:
        stretch = min(float(stretch_match.group(1).replace(",", "")) / budget, 1.0)
    elif open_to_more and budget and not hard:
        stretch = None  # must be clarified; never invent a percentage
    evidence = {
        "budget": "explicit budget supplied" if budget else "no explicit budget supplied",
        "quality": "quality/value language detected" if quality else "no quality preference supplied",
        "upsell": "hard refusal" if reject_more else ("openness language detected" if open_to_more else "no explicit openness supplied"),
    }
    return CustomerIntent(
        stated_budget=budget,
        budget_restrictiveness=1.0 if hard else (0.9 if cheap else (0.55 if budget else 0.5)),
        quality_value_orientation=0.8 if quality else (0.2 if cheap else 0.5),
        upsell_openness=0.0 if (reject_more or (cheap and not open_to_more)) else (0.8 if open_to_more else 0.5),
        acceptable_budget_stretch=stretch,
        hard_budget_constraint=hard,
        confidence=0.9 if budget and (quality or open_to_more or hard or cheap) else (0.6 if budget else 0.25),
        evidence=evidence,
    )


_INTENT_ANALYZER_PROMPT = """You analyze buying preferences; you are not a salesperson and never select products.
Infer only from the supplied conversation: budget restrictiveness, quality/value orientation, willingness to spend more for a meaningful improvement, a stated budget, an inferred stretch only when explicitly supported, confidence, and short evidence snippets. All scores are 0-1. Never invent facts. If evidence is absent, use neutral values and low confidence. A hard budget refusal must set hard_budget_constraint true and upsell_openness near zero."""


def _structured_llm_intent(messages: List[Any]) -> Optional[CustomerIntent]:
    """Use the existing model provider's structured-output support when enabled.

    A conservative rules result remains available on provider failure so catalog
    and checkout interactions never become unavailable because of this feature.
    """
    if os.getenv("INTENT_ANALYZER_LLM", "true").lower() not in {"1", "true", "yes"}:
        return None
    try:
        # Keep this agent independent from merchant_llm package initialization
        # (which owns payment/cart dependencies).
        from langchain_ollama import ChatOllama
        model = ChatOllama(
            base_url=os.getenv("OLLAMA_BASE_URL", "http://host.docker.internal:11434"),
            model=os.getenv("INTENT_ANALYZER_MODEL", "gpt-oss:20b-cloud"),
            temperature=0.0,
        ).with_structured_output(CustomerIntent)
        return model.invoke(_INTENT_ANALYZER_PROMPT + "\n\nConversation:\n" + _text(messages))
    except Exception as exc:
        logger.warning("intent_analyzer_structured_output_unavailable: %s", exc)
        return None


def _catalog_candidates(query: str, wiki_base_path: str) -> List[Dict[str, Any]]:
    pages = get_all_wiki_pages(wiki_base_path, section="knowledge")
    candidates: List[Dict[str, Any]] = []
    # Do not turn a best-effort fuzzy result into an availability claim. A page
    # must have a meaningful term-level match before it becomes a candidate.
    ignored = {"i", "need", "want", "can", "get", "show", "me", "a", "an", "the", "please", "for", "to", "buy", "around", "under", "within", "rs", "inr"}
    terms = [term for term in re.findall(r"[a-z0-9]+", query.lower()) if term not in ignored and not term.isdigit()]
    aliases = {"phone": {"phone", "smartphone", "iphone", "mobile"}, "watch": {"watch", "smartwatch"}}
    for page in retrieve_relevant_pages(pages, query, top_k=8):
        price = extract_price_from_page(page)
        if price is None or page.get("folder") != "products":
            continue
        name_match = re.search(r"^name\s*:\s*(.+)$", page.get("content", ""), re.MULTILINE | re.IGNORECASE)
        searchable = " ".join((page.get("slug", ""), extract_category_from_page(page), name_match.group(1) if name_match else "")).lower()
        query_aliases = [alias for term in terms for alias in aliases.get(term, {term})]
        if terms and not any(alias in searchable or fuzz.partial_ratio(alias, searchable) >= 90 for alias in query_aliases):
            continue
        candidates.append({
            "id": page["slug"], "name": page["slug"].replace("-", " ").title(),
            "price": price, "category": extract_category_from_page(page),
            "source": page["rel_path"], "attributes": page["content"][:700],
        })
    return sorted({p["id"]: p for p in candidates}.values(), key=lambda p: p["price"])


def _cross_sell_candidates(primary: Optional[Dict[str, Any]], all_candidates: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    if not primary:
        return []
    # A conservative category-local fallback. Explicit catalog relationships remain preferred by existing marketing tool.
    return [p for p in all_candidates if p["id"] != primary["id"] and p["category"] == primary["category"]]


def _analyze_selling_context(state: Dict[str, Any], wiki_base_path: str) -> Dict[str, Any]:
    """Build safe state additions consumed by the existing Merchant LLM node."""
    messages = state.get("messages", [])
    latest = _latest_customer_message(messages)
    # The analyzer is a single focused LLM call with a schema; deterministic
    # parsing is retained as an availability-safe fallback. Policy always stays
    # in Python regardless of where the signals came from.
    intent = _structured_llm_intent(messages) or _infer_intent(messages)
    candidates = _catalog_candidates(latest, wiki_base_path) if latest else []
    score = calculate_upsell_score(intent.budget_restrictiveness, intent.quality_value_orientation, intent.upsell_openness)
    boundary = calculate_budget_boundary(intent.stated_budget, intent.acceptable_budget_stretch, intent.hard_budget_constraint)
    decision = decide_upsell(score, intent.hard_budget_constraint)
    upsell = select_upsell_candidate(candidates, intent.stated_budget, boundary)
    selected = next((p for p in candidates if p["id"] in latest.lower().replace(" ", "-")), None)
    cross = decide_cross_sell(bool(selected), _cross_sell_candidates(selected, candidates), state.get("cross_sell_shown", []), state.get("cross_sell_rejected", False))
    question_count = _count_clarification_questions(messages)
    history = list(state.get("intent_history", [])) + [intent.model_dump()]
    logger.info("intent_analysis=%s", {"customer_need": latest, "budget": intent.stated_budget, "budget_restrictiveness": intent.budget_restrictiveness, "quality_value_orientation": intent.quality_value_orientation, "upsell_openness": intent.upsell_openness, "acceptable_budget_stretch": intent.acceptable_budget_stretch, "upsell_opportunity_score": score, "decision": decision})
    return {
        "product_need": latest or None, "catalog_context": candidates, "candidate_products": candidates,
        "stated_budget": intent.stated_budget, "effective_budget": boundary,
        "acceptable_budget_stretch": intent.acceptable_budget_stretch,
        "budget_restrictiveness": intent.budget_restrictiveness, "quality_value_orientation": intent.quality_value_orientation,
        "upsell_openness": intent.upsell_openness, "upsell_opportunity_score": score, "upsell_decision": decision,
        "intent_confidence": intent.confidence, "intent_evidence": intent.evidence, "intent_history": history,
        "questions_asked": question_count, "recommended_product": upsell, "cross_sell_candidates": cross,
    }
