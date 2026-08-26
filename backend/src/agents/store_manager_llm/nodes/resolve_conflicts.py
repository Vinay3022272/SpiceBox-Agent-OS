"""
resolve_conflicts — LLM NODE

Detects and records contradictions between sources.
Doesn't silently overwrite — records them with traceability.
"""

try:
    from ..state import WikiState, Contradiction
    from ..utils.llm import call_llm_json
except (ImportError, ValueError):
    from src.agents.store_manager_llm.state import WikiState, Contradiction
    from src.agents.store_manager_llm.utils.llm import call_llm_json


def resolve_conflicts(state: WikiState) -> dict:
    """
    Process detected contradictions.
    For each conflict, determine:
      1. Which source should be preferred
      2. Record the conflict in the page
    """
    contradictions = state.get("contradictions", [])

    if not contradictions:
        print("  No conflicts to resolve")
        return {"contradictions": []}

    resolved: list[Contradiction] = []

    # Batch process conflicts
    for conflict in contradictions:
        prompt = (
            f"A data conflict was detected for product '{conflict['product_slug']}'.\n\n"
            f"Field: {conflict['field']}\n"
            f"Existing value: {conflict['existing_value']} (Source: {conflict['existing_source']})\n"
            f"New value: {conflict['new_value']} (Source: {conflict['new_source']})\n\n"
            f"Which source should be preferred? Consider:\n"
            f"- Manufacturer specs are usually more accurate than third-party sources\n"
            f"- More recent data may reflect updates\n"
            f"- If unable to determine, mark as 'pending'\n\n"
            f"Return JSON: {{\n"
            f"  \"resolution\": \"resolved\" or \"pending\",\n"
            f"  \"preferred_source\": \"which source to prefer\",\n"
            f"  \"reasoning\": \"why\"\n"
            f"}}"
        )

        try:
            result = call_llm_json(prompt, system="You are a data quality analyst.")
            conflict_resolved = dict(conflict)
            conflict_resolved["resolution"] = result.get("resolution", "pending")
            conflict_resolved["preferred_source"] = result.get("preferred_source", "")
            resolved.append(conflict_resolved)
        except Exception:
            resolved.append(conflict)

    pending = sum(1 for c in resolved if c["resolution"] == "pending")
    resolved_count = len(resolved) - pending
    print(f"  Conflicts: {resolved_count} resolved, {pending} pending")

    return {"contradictions": resolved}
