"""Intent Analyzer node: catalog grounding → customer signals → policy state."""

from typing import Any, Dict

from ..analyzer import _analyze_selling_context
from ..state import IntentAnalysisState


def intent_analyzer_node(state: IntentAnalysisState) -> Dict[str, Any]:
    """Return only state additions, preserving the parent Merchant graph contract."""
    return _analyze_selling_context(state, state.get("wiki_base_path", "./merchant_knowledge"))
