"""
query_pipeline.py — Read & Query pipeline for the Store Managing Agent.

Reads and retrieves information from the persistent Merchant Knowledge Wiki
(markdown pages created during the write/ingestion phase) and uses the LLM
to answer queries with accurate context and source references.
"""

import os
import re
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple
from rapidfuzz import fuzz, process

from .utils.file_io import read_markdown
from .utils.llm import call_llm
from .utils.wiki_search import search_page_content, fuzzy_match_slug


def get_all_wiki_pages(wiki_base_path: str, section: str | None = None) -> List[Dict[str, str]]:
    """
    Traverse the merchant_knowledge/wiki directory and collect all markdown pages.
    """
    base = Path(wiki_base_path)
    if (base / "wiki").exists():
        wiki_dir = base / "wiki"
    elif (base / "knowledge").exists() or (base / "marketing").exists():
        wiki_dir = base
    else:
        wiki_dir = base / "wiki"

    if not wiki_dir.exists():
        return []

    pages = []
    
    # Determine sections to search
    sections = [section] if section else ["knowledge", "marketing"]

    for sec in sections:
        sec_dir = wiki_dir / sec
        if not sec_dir.exists():
            continue

        for md_file in sec_dir.rglob("*.md"):
            try:
                rel_path = md_file.relative_to(wiki_dir)
                content = md_file.read_text(encoding="utf-8")
                pages.append({
                    "slug": md_file.stem,
                    "rel_path": str(rel_path).replace("\\", "/"),
                    "full_path": str(md_file),
                    "section": sec,
                    "folder": md_file.parent.name,
                    "content": content,
                })
            except Exception:
                continue

    # Also check master index
    master_index = wiki_dir / "index.md"
    if master_index.exists():
        try:
            pages.append({
                "slug": "index",
                "rel_path": "index.md",
                "full_path": str(master_index),
                "section": "master",
                "folder": "root",
                "content": master_index.read_text(encoding="utf-8"),
            })
        except Exception:
            pass

    return pages


# ---------------------------------------------------------------------------
#  Upsell Detection & Price-Based Filtering (functional logic)
# ---------------------------------------------------------------------------

# Regex patterns for detecting purchase intent with a price threshold
_PRICE_PATTERN = re.compile(
    r"(?:₹|rs\.?|inr|price|budget|under|above|over|more\s+than|less\s+than|below|upto|up\s+to|atleast|at\s+least|starting|from|within|around)\s*[:\-]?\s*([\d,]+)",
    re.IGNORECASE,
)
_PRICE_PLAIN_PATTERN = re.compile(
    r"([\d,]+)\s*(?:₹|rs\.?|inr|rupees?)",
    re.IGNORECASE,
)

_PURCHASE_KEYWORDS = {
    "buy", "purchase", "order", "want", "need", "looking for",
    "suggest", "recommend", "show", "get", "find", "shop",
    "interested", "affordable", "budget", "upsell", "options",
}


def detect_upsell_intent(query: str) -> Optional[Tuple[float, str]]:
    """
    Detect whether a user query expresses purchase intent with a price
    threshold.  Returns (price_threshold, cleaned_query_without_price) if
    detected, else None.
    """
    query_lower = query.lower()

    # Check for purchase-related keywords
    has_purchase_intent = any(kw in query_lower for kw in _PURCHASE_KEYWORDS)
    if not has_purchase_intent:
        return None

    # Try to extract a numeric price from the query
    price_value = None
    match = _PRICE_PATTERN.search(query)
    if not match:
        match = _PRICE_PLAIN_PATTERN.search(query)
    if match:
        raw = match.group(1).replace(",", "")
        try:
            price_value = float(raw)
        except ValueError:
            return None

    if price_value is None:
        return None

    # Remove the price portion from query so remaining text = category hint
    cleaned = _PRICE_PATTERN.sub("", query)
    cleaned = _PRICE_PLAIN_PATTERN.sub("", cleaned)
    # Strip common filler words to isolate the category
    for word in ["i", "want", "to", "buy", "purchase", "a", "an", "me",
                 "show", "get", "find", "some", "the", "please", "in",
                 "looking", "for", "suggest", "recommend", "need", "of",
                 "above", "below", "under", "over", "more", "than",
                 "less", "upto", "up", "atleast", "at", "least",
                 "starting", "from", "around", "within", "price",
                 "budget", "range", "with", "options"]:
        cleaned = re.sub(rf"\b{word}\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip().strip(".,;:-")

    return (price_value, cleaned)


def detect_product_purchase_intent(query: str) -> Optional[str]:
    """
    Detect purchase intent WITHOUT an explicit price.
    e.g. "I want to buy iPhone 15", "get me Samsung Galaxy S24"

    Returns the cleaned product name hint, or None if no purchase intent.
    """
    query_lower = query.lower()

    has_purchase_intent = any(kw in query_lower for kw in _PURCHASE_KEYWORDS)
    if not has_purchase_intent:
        return None

    # If there IS a price in the query, this is handled by detect_upsell_intent instead
    if _PRICE_PATTERN.search(query) or _PRICE_PLAIN_PATTERN.search(query):
        return None

    # Strip purchase filler words to isolate the product name
    cleaned = query
    for word in ["i", "want", "to", "buy", "purchase", "a", "an", "me",
                 "show", "get", "find", "some", "the", "please", "in",
                 "looking", "for", "suggest", "recommend", "need", "of",
                 "can", "you", "could", "would", "like", "order"]:
        cleaned = re.sub(rf"\b{word}\b", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+", " ", cleaned).strip().strip(".,;:-")

    return cleaned if cleaned else None


def resolve_product_for_upsell(
    pages: List[Dict[str, str]], product_hint: str
) -> Optional[Tuple[float, str]]:
    """
    Given a product name hint (e.g. "iPhone 15"), fuzzy-match it against
    wiki product pages.  If a match is found, return
    (product_price, product_category) so the caller can upsell all items
    in the same category at or above that price.

    Returns None if no matching product is found.
    """
    hint_lower = product_hint.lower()
    best_match = None
    best_score = 0.0

    for page in pages:
        # Only consider product pages
        page_type = ""
        type_match = re.search(
            r"^type\s*:\s*(\S+)", page["content"],
            re.MULTILINE | re.IGNORECASE,
        )
        if type_match:
            page_type = type_match.group(1).strip().lower()
        if page_type != "product" and page.get("folder") != "products":
            continue

        slug_clean = page["slug"].replace("-", " ").replace("_", " ").lower()

        # Also extract the `name:` field from YAML frontmatter
        name_field = slug_clean
        name_match = re.search(
            r"^name\s*:\s*(.+)$", page["content"],
            re.MULTILINE | re.IGNORECASE,
        )
        if name_match:
            name_field = name_match.group(1).strip().lower()

        # Score against both slug and name field
        score = max(
            fuzz.partial_ratio(hint_lower, slug_clean),
            fuzz.partial_ratio(hint_lower, name_field),
        )

        if score > best_score:
            best_score = score
            best_match = page

    if best_match is None or best_score < 65:
        return None

    price = extract_price_from_page(best_match)
    if price is None:
        return None

    category = extract_category_from_page(best_match)
    return (price, category)



def extract_price_from_page(page: Dict[str, str]) -> Optional[float]:
    """
    Parse a numeric price (INR) from a wiki page's content.
    Checks YAML frontmatter-style `price:` fields, markdown bold fields
    like `**Price**: 79900 INR`, and table rows.
    """
    content = page["content"]

    # Pattern 1: **Price**: 79900 INR  (product pages)
    m = re.search(r"\*\*Price\*\*\s*[:\-]\s*([\d,]+)", content, re.IGNORECASE)
    if m:
        return float(m.group(1).replace(",", ""))

    # Pattern 2: YAML frontmatter  price: 79900
    m = re.search(r"^price\s*:\s*([\d,]+)", content, re.MULTILINE | re.IGNORECASE)
    if m:
        return float(m.group(1).replace(",", ""))

    # Pattern 3: table row  | ProductName | Brand | 79900 INR | ...
    # Only useful for category pages; not used for single-product matching
    return None


def extract_category_from_page(page: Dict[str, str]) -> str:
    """
    Extract the category name from a product page's YAML frontmatter.
    Falls back to the page's parent folder name.
    """
    m = re.search(r"^category\s*:\s*(.+)$", page["content"], re.MULTILINE | re.IGNORECASE)
    if m:
        return m.group(1).strip().lower()
    return page.get("folder", "").lower()


def retrieve_upsell_pages(
    pages: List[Dict[str, str]],
    price_threshold: float,
    category_hint: str,
) -> List[Dict[str, Any]]:
    """
    Retrieve ALL product pages whose price >= price_threshold and that
    belong to (or fuzzy-match) the requested category.

    Returns pages sorted by price ascending (closest to budget first).
    If no exact category match, falls back to the best fuzzy-matched
    category and returns all products from it above the threshold.
    """
    category_hint_lower = category_hint.lower()
    candidate_pages = []

    for page in pages:
        # Only consider product pages (not index / category summary pages)
        page_type = ""
        type_match = re.search(r"^type\s*:\s*(\S+)", page["content"], re.MULTILINE | re.IGNORECASE)
        if type_match:
            page_type = type_match.group(1).strip().lower()

        if page_type != "product" and page.get("folder") != "products":
            continue

        # --- Category matching ---
        page_category = extract_category_from_page(page)
        slug_clean = page["slug"].replace("-", " ").replace("_", " ").lower()

        # Fuzzy match category hint against the page's category or slug
        cat_score = fuzz.partial_ratio(category_hint_lower, page_category)
        slug_score = fuzz.partial_ratio(category_hint_lower, slug_clean)
        content_has_hint = category_hint_lower in page["content"].lower()

        if cat_score < 55 and slug_score < 55 and not content_has_hint:
            continue  # not in the requested category

        # --- Price filtering ---
        price = extract_price_from_page(page)
        if price is None:
            continue  # can't determine price, skip

        if price >= price_threshold:
            candidate_pages.append({
                "page": page,
                "price": price,
            })

    # Sort by price ascending (closest to budget first)
    candidate_pages.sort(key=lambda x: x["price"])

    # If no products matched by category + price, try WITHOUT category filter
    # (return all products above the price across the entire store)
    if not candidate_pages:
        for page in pages:
            page_type = ""
            type_match = re.search(r"^type\s*:\s*(\S+)", page["content"], re.MULTILINE | re.IGNORECASE)
            if type_match:
                page_type = type_match.group(1).strip().lower()
            if page_type != "product" and page.get("folder") != "products":
                continue
            price = extract_price_from_page(page)
            if price is not None and price >= price_threshold:
                candidate_pages.append({"page": page, "price": price})
        candidate_pages.sort(key=lambda x: x["price"])

    return [item["page"] for item in candidate_pages]


def retrieve_relevant_pages(
    pages: List[Dict[str, str]], query: str, top_k: int = 5
) -> List[Dict[str, Any]]:
    """
    Rank and retrieve top-k relevant wiki pages for a given natural language query.
    Uses title fuzzy matching, keyword match, and content similarity.
    """
    query_lower = query.lower()
    query_tokens = set(query_lower.replace("-", " ").replace("_", " ").split())

    scored_pages = []

    for page in pages:
        score = 0.0
        slug_clean = page["slug"].replace("-", " ").replace("_", " ")
        content_lower = page["content"].lower()

        # 1. Exact or partial slug match
        slug_match_score = fuzz.partial_ratio(query_lower, slug_clean)
        score += slug_match_score * 1.5

        # 2. Token overlap in slug
        slug_tokens = set(slug_clean.split())
        overlap = query_tokens.intersection(slug_tokens)
        if overlap:
            score += len(overlap) * 20.0

        # 3. Content matching
        if query_lower in content_lower:
            score += 40.0

        # 4. Partial content ratio for query
        content_snippet_score = fuzz.partial_ratio(query_lower, content_lower[:800])
        score += content_snippet_score * 0.5

        # Include index pages if query is general overview/list/categories
        if page["slug"] == "index" and any(k in query_lower for k in ["all", "list", "categories", "products", "what", "catalog", "store"]):
            score += 30.0

        if score > 20.0:
            scored_pages.append({
                "page": page,
                "score": score,
            })

    # Sort descending by score
    scored_pages.sort(key=lambda x: x["score"], reverse=True)

    # If no pages matched above threshold, return top pages by content partial ratio
    if not scored_pages and pages:
        for page in pages:
            s = fuzz.partial_ratio(query_lower, page["content"].lower()[:500])
            scored_pages.append({"page": page, "score": s})
        scored_pages.sort(key=lambda x: x["score"], reverse=True)

    return [item["page"] for item in scored_pages[:top_k]]


def query_wiki(
    query: str,
    wiki_base_path: str = "./merchant_knowledge_test",
    merchant_id: str = "default_merchant",
    section: str | None = None,
    top_k: int = 5,
) -> Dict[str, Any]:
    """
    Read/Query pipeline: Retrieves wiki context for a query and generates an LLM response.

    Args:
        query: User query or question
        wiki_base_path: Root directory of merchant knowledge wiki
        merchant_id: ID of the merchant
        section: Optional filter ("knowledge" or "marketing")
        top_k: Number of relevant markdown pages to retrieve as context

    Returns:
        Dict with keys:
          - query: input query
          - answer: text answer from LLM
          - sources: list of source relative paths used
          - page_count: total pages searched
    """
    all_pages = get_all_wiki_pages(wiki_base_path, section=section)

    if not all_pages:
        return {
            "query": query,
            "answer": f"No wiki pages found at path '{wiki_base_path}'. Please run the write pipeline first to create the wiki.",
            "sources": [],
            "page_count": 0,
        }

    # ------------------------------------------------------------------
    #  Decide retrieval strategy: upsell (price-filtered) vs. general
    # ------------------------------------------------------------------
    upsell_info = detect_upsell_intent(query)
    is_upsell = False

    # Case 1: Purchase intent WITH an explicit price  ("smartphones above ₹80000")
    if upsell_info:
        price_threshold, category_hint = upsell_info
        upsell_pages = retrieve_upsell_pages(all_pages, price_threshold, category_hint)
        if upsell_pages:
            relevant_pages = upsell_pages[:8]  # cap to top 8 items for token safety
            is_upsell = True

    # Case 2: Purchase intent with a product name but NO price  ("buy iPhone 15")
    if not is_upsell:
        product_hint = detect_product_purchase_intent(query)
        if product_hint:
            resolved = resolve_product_for_upsell(all_pages, product_hint)
            if resolved:
                price_threshold, category_hint = resolved
                upsell_pages = retrieve_upsell_pages(
                    all_pages, price_threshold, category_hint
                )
                if upsell_pages:
                    relevant_pages = upsell_pages[:8]
                    upsell_info = (price_threshold, category_hint)
                    is_upsell = True

    # Case 3: No purchase intent — standard fuzzy retrieval
    if not is_upsell:
        relevant_pages = retrieve_relevant_pages(all_pages, query, top_k=top_k)

    # Build context string
    context_blocks = []
    sources = []
    for p in relevant_pages[:4]:
        sources.append(p["rel_path"])
        page_snippet = p["content"][:1600]
        context_blocks.append(
            f"--- START PAGE: {p['rel_path']} ---\n{page_snippet}\n--- END PAGE: {p['rel_path']} ---"
        )

    context_str = "\n\n".join(context_blocks)

    # Build system prompt — adapt instructions based on whether this is an upsell query
    base_guidelines = (
        "You are the Store Manager Assistant reading from the Merchant Knowledge Wiki.\n"
        "Your job is to answer user queries accurately based strictly on the provided Wiki Pages.\n"
        "Guidelines:\n"
        "1. Base your answer on the facts, product specifications, prices, reviews, categories, or promotions in the context.\n"
        "2. Be concise, structured, and helpful.\n"
        "3. Explicitly cite the source markdown files (e.g. `knowledge/products/iphone-15.md`) where appropriate.\n"
    )

    if is_upsell:
        price_threshold, category_hint = upsell_info  # guaranteed set when is_upsell=True
        upsell_guideline = (
            f"4. MUST — Upsell Mode is ACTIVE. The user asked for products"
            f" in '{category_hint or 'all categories'}' priced at or above ₹{price_threshold:,.0f}.\n"
            "   The context below contains ONLY the pre-filtered qualifying products.\n"
            "   a) Present EVERY product from the context in a structured table: Product Name | Price (INR) | Key Highlights | Source Page.\n"
            "   b) Sort by price ascending (closest to budget first).\n"
            "   c) Do NOT omit any product — completeness is critical.\n"
            "   d) Frame recommendations positively, e.g. 'Here are the best options in your range and above that offer great value.'\n"
            "   e) After the table, add a brief recommendation highlighting the best value pick.\n"
        )
        system_prompt = base_guidelines + upsell_guideline
    else:
        system_prompt = base_guidelines + (
            "4. If the requested information is not in the wiki, state clearly that it is not present in the store knowledge base.\n"
        )


    user_prompt = (
        f"Merchant ID: {merchant_id}\n"
        f"User Question: {query}\n\n"
        f"Retrieved Wiki Context:\n"
        f"{context_str}\n\n"
        f"Please provide a detailed and clear answer to the user question based on the context above."
    )

    # Call LLM using existing llm helper
    try:
        answer = call_llm(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.2,
            include_schema=False,
        )
    except Exception as e:
        answer = f"Error generating answer: {str(e)}"

    return {
        "query": query,
        "answer": answer,
        "sources": sources,
        "page_count": len(all_pages),
    }


def query_knowledge_base(
    query: str,
    wiki_base_path: str = "./merchant_knowledge_test",
    merchant_id: str = "default_merchant",
    top_k: int = 5,
) -> Dict[str, Any]:
    """
    Query the product knowledge base (products, categories, specs, reviews).
    """
    return query_wiki(
        query=query,
        wiki_base_path=wiki_base_path,
        merchant_id=merchant_id,
        section="knowledge",
        top_k=top_k,
    )


def query_marketing_intelligence(
    query: str,
    wiki_base_path: str = "./merchant_knowledge_test",
    merchant_id: str = "default_merchant",
    top_k: int = 5,
) -> Dict[str, Any]:
    """
    Query the marketing intelligence base (promotions, campaigns, popular items).
    """
    return query_wiki(
        query=query,
        wiki_base_path=wiki_base_path,
        merchant_id=merchant_id,
        section="marketing",
        top_k=top_k,
    )


def query_upsell_alternatives(
    product_name: str,
    wiki_base_path: str = "./merchant_knowledge_test",
    merchant_id: str = "default_merchant",
) -> Dict[str, Any]:
    """
    Indian shopkeeper-style upsell: Given a product, find the exact product
    AND all better-priced alternatives in the same category.
    Searches both knowledge/ and marketing/ sections.
    """
    all_pages = get_all_wiki_pages(wiki_base_path, section=None)
    if not all_pages:
        return {
            "query": product_name,
            "answer": f"No wiki pages found at path '{wiki_base_path}'.",
            "sources": [],
            "alternatives_count": 0,
        }

    # 1. Fuzzy match target product
    resolved = resolve_product_for_upsell(all_pages, product_name)
    target_price = None
    target_category = ""
    target_page = None

    if resolved:
        target_price, target_category = resolved
        for p in all_pages:
            if target_category and extract_category_from_page(p) == target_category:
                p_price = extract_price_from_page(p)
                if p_price == target_price:
                    target_page = p
                    break

    if not target_page:
        best_pages = retrieve_relevant_pages(all_pages, product_name, top_k=1)
        if best_pages:
            target_page = best_pages[0]
            target_price = extract_price_from_page(target_page) or 0.0
            target_category = extract_category_from_page(target_page)

    if not target_page:
        return query_wiki(
            query=f"Find {product_name} and any similar items",
            wiki_base_path=wiki_base_path,
            merchant_id=merchant_id,
        )

    # 2. Retrieve same-category products priced higher (upsell candidates)
    threshold = target_price or 0.0
    upsell_candidates = []
    if target_category:
        upsell_candidates = retrieve_upsell_pages(all_pages, threshold, target_category)
        upsell_candidates = [
            p for p in upsell_candidates
            if p.get("slug") != target_page.get("slug") and (extract_price_from_page(p) or 0.0) >= threshold
        ]

    if not upsell_candidates and threshold > 0:
        upsell_candidates = retrieve_upsell_pages(all_pages, threshold, "")
        upsell_candidates = [
            p for p in upsell_candidates
            if p.get("slug") != target_page.get("slug")
        ]

    alternatives = upsell_candidates[:4]

    # 3. Build context blocks
    sources = [target_page["rel_path"]]
    target_snippet = target_page["content"][:800]
    context_blocks = [
        f"--- ASKED PRODUCT ({target_page['rel_path']}) ---\n{target_snippet}\n--- END ASKED PRODUCT ---"
    ]

    for alt in alternatives:
        sources.append(alt["rel_path"])
        alt_snippet = alt["content"][:650]
        context_blocks.append(
            f"--- BETTER ALTERNATIVE ({alt['rel_path']}) ---\n{alt_snippet}\n--- END ALTERNATIVE ---"
        )

    context_str = "\n\n".join(context_blocks)

    # 4. Natural Shopkeeper System Prompt (English only)
    system_prompt = (
        "You are a friendly, street-smart shopkeeper who genuinely loves helping customers find the perfect product.\n"
        "When a customer asks about a product, respond like a real person — NOT like a product catalog:\n\n"
        "1. FIRST, show them the exact product they asked for with its key specs and price in INR. Genuinely compliment their choice.\n"
        "2. THEN, casually and naturally suggest 1-3 better alternatives from the same category — like it just occurred to you:\n"
        "   Example: 'That's a great pick! But you know what, since you're looking at [category], you might also want to check out [Alternative]. "
        "It's got [specific advantage] and for just a bit more, it's honestly a fantastic upgrade.'\n\n"
        "IMPORTANT RULES:\n"
        "- Talk like a real person having a conversation, NOT like a bot listing items.\n"
        "- Do NOT dump alternatives in a formal comparison table. Weave them naturally into your response.\n"
        "- You can use bullet points for product specs, but alternatives should be mentioned conversationally.\n"
        "- Only use a comparison table if the customer explicitly asks to compare products.\n"
        "- Language: ALWAYS respond in English only.\n"
        "- Facts: Use ONLY real details from the provided wiki pages. Never invent prices or specs.\n"
        "- Do NOT add anything to cart — always ask what they'd like to do."
    )

    user_prompt = (
        f"Customer asked about: '{product_name}'\n\n"
        f"Wiki Store Context:\n{context_str}\n\n"
        "Respond naturally — compliment their choice, show the product details, then casually suggest the better alternatives "
        "like a friendly shopkeeper who just thought of something. Keep it conversational, not listy."
    )

    try:
        answer = call_llm(
            prompt=user_prompt,
            system=system_prompt,
            temperature=0.5,
            include_schema=False,
        )
    except Exception as e:
        print(f"  [query_upsell_alternatives] LLM fallback: {e}")
        t_name = target_page.get("slug", "").replace("-", " ").title()
        lines = [f"### 🛍️ {t_name}"]
        if target_price:
            lines.append(f"- **Price**: ₹{target_price:,.2f} INR")
        lines.append("- High-quality store item with full warranty.")

        if alternatives:
            lines.append(f"\nGreat choice on the **{t_name}**! But since you're here, let me show you a couple more options you might love:\n")
            for alt in alternatives:
                a_name = alt.get("slug", "").replace("-", " ").title()
                a_price = extract_price_from_page(alt) or 0.0
                lines.append(f"- **{a_name}** at ₹{a_price:,.2f} — premium build with superior performance")
            lines.append("\nSo what do you think — want me to add the original to your cart, or would you rather go with one of these?")
        answer = "\n".join(lines)

    return {
        "query": product_name,
        "answer": answer,
        "sources": sources,
        "alternatives_count": len(alternatives),
    }

