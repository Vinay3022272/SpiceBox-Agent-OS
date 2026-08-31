"""
graph.py — LangGraph definition for the Wiki Maintainer Agent.

Graph topology:
  collect_data → extract_entities → extract_reviews
  → search_existing_wiki → knowledge_diff
  → [conditional: create_pages / update_pages / resolve_conflict]
  → resolve_conflict → cross_reference → update_index → append_log
  → validate_wiki → END
"""

from langgraph.graph import StateGraph, START, END

from .state import WikiState

# Import all nodes
from .nodes.collect_data import collect_data
from .nodes.extract_entities import extract_entities
from .nodes.extract_reviews import extract_reviews
from .nodes.search_existing_wiki import search_existing_wiki
from .nodes.knowledge_diff import knowledge_diff
from .nodes.create_pages import create_pages
from .nodes.update_pages import update_pages
from .nodes.resolve_conflict import resolve_conflict
from .nodes.cross_reference import cross_reference
from .nodes.update_index import update_index
from .nodes.append_log import append_log
from .nodes.validate_wiki import validate_wiki


def _route_after_diff(state: WikiState) -> str:
    """
    Conditional routing after knowledge_diff.
    Routes to create_pages, update_pages, or resolve_conflict.
    """
    has_creates = bool(state.get("pages_to_create"))
    has_updates = bool(state.get("pages_to_update"))

    if has_creates and has_updates:
        return "create_pages"  # create first, then update
    elif has_creates:
        return "create_pages"
    elif has_updates:
        return "update_pages"
    else:
        return "resolve_conflict"  # nothing to create or update


def _route_after_create(state: WikiState) -> str:
    """After creating pages, check if we also need to update."""
    if state.get("pages_to_update"):
        return "update_pages"
    return "resolve_conflict"


def build_wiki_graph():
    """
    Build and compile the LangGraph for wiki maintenance.

    Returns a compiled graph ready to invoke.
    """
    graph_builder = StateGraph(WikiState)

    # ── Nodes ────────────────────────────────────────────────────────────
    graph_builder.add_node("collect_data", collect_data)
    graph_builder.add_node("extract_entities", extract_entities)
    graph_builder.add_node("extract_reviews", extract_reviews)
    graph_builder.add_node("search_existing_wiki", search_existing_wiki)
    graph_builder.add_node("knowledge_diff", knowledge_diff)
    graph_builder.add_node("create_pages", create_pages)
    graph_builder.add_node("update_pages", update_pages)
    graph_builder.add_node("resolve_conflict", resolve_conflict)
    graph_builder.add_node("cross_reference", cross_reference)
    graph_builder.add_node("update_index", update_index)
    graph_builder.add_node("append_log", append_log)
    graph_builder.add_node("validate_wiki", validate_wiki)

    # ── Edges ────────────────────────────────────────────────────────────
    graph_builder.add_edge(START, "collect_data")
    graph_builder.add_edge("collect_data", "extract_entities")
    graph_builder.add_edge("extract_entities", "extract_reviews")
    graph_builder.add_edge("extract_reviews", "search_existing_wiki")
    graph_builder.add_edge("search_existing_wiki", "knowledge_diff")

    # ── Conditional edges ────────────────────────────────────────────────
    graph_builder.add_conditional_edges(
        "knowledge_diff",
        _route_after_diff,
        {
            "create_pages": "create_pages",
            "update_pages": "update_pages",
            "resolve_conflict": "resolve_conflict",
        }
    )

    graph_builder.add_conditional_edges(
        "create_pages",
        _route_after_create,
        {
            "update_pages": "update_pages",
            "resolve_conflict": "resolve_conflict",
        }
    )

    graph_builder.add_edge("update_pages", "resolve_conflict")
    graph_builder.add_edge("resolve_conflict", "cross_reference")
    graph_builder.add_edge("cross_reference", "update_index")
    graph_builder.add_edge("update_index", "append_log")
    graph_builder.add_edge("append_log", "validate_wiki")
    graph_builder.add_edge("validate_wiki", END)

    return graph_builder.compile()
