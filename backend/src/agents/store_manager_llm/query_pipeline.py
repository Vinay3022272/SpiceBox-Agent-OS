"""
query_pipeline.py — Read & Query pipeline for the Store Managing Agent.

Reads and retrieves information from the persistent Merchant Knowledge Wiki
(markdown pages created during the write/ingestion phase) and uses the LLM
to answer queries with accurate context and source references.
"""

import os
from pathlib import Path
from typing import Any, Dict, List
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
    wiki_base_path: str = "./merchant_knowledge",
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

    # Retrieve relevant pages
    relevant_pages = retrieve_relevant_pages(all_pages, query, top_k=top_k)

    # Build context string
    context_blocks = []
    sources = []
    for p in relevant_pages:
        sources.append(p["rel_path"])
        context_blocks.append(
            f"--- START PAGE: {p['rel_path']} ---\n{p['content']}\n--- END PAGE: {p['rel_path']} ---"
        )

    context_str = "\n\n".join(context_blocks)

    system_prompt = (
        "You are the Store Manager Assistant reading from the Merchant Knowledge Wiki.\n"
        "Your job is to answer user queries accurately based strictly on the provided Wiki Pages.\n"
        "Guidelines:\n"
        "1. Base your answer on the facts, product specifications, prices, reviews, categories, or promotions in the context.\n"
        "2. Be concise, structured, and helpful.\n"
        "3. Explicitly cite the source markdown files (e.g. `knowledge/products/iphone-15.md`) where appropriate.\n"
        "4. If the requested information is not in the wiki, state clearly that it is not present in the store knowledge base."
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
