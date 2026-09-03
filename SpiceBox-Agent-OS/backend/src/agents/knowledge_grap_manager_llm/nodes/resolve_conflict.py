from ..state import WikiState, Contradiction
from ..utils.llm import call_llm_json


def resolve_conflict(state: WikiState) -> dict:
    """
    Process detected contradictions from state.
    For each conflict, determine:
      1. Which source should be preferred
      2. Record resolution or mark as pending
    """
    contradictions = state.get("contradictions", [])

    if not contradictions:
        print("  No conflicts to resolve")
        return {"contradictions": []}

    resolved: list[Contradiction] = []

    for conflict in contradictions:
        prod_slug = conflict.get("product_slug", "unknown")
        field_name = conflict.get("field", "unknown")
        exist_val = conflict.get("existing_value", "")
        exist_src = conflict.get("existing_source", "existing wiki")
        new_val = conflict.get("new_value", "")
        new_src = conflict.get("new_source", "db_source")

        prompt = (
            f"A data conflict was detected for product '{prod_slug}'.\n\n"
            f"Field: {field_name}\n"
            f"Existing value: {exist_val} (Source: {exist_src})\n"
            f"New value: {new_val} (Source: {new_src})\n\n"
            f"Which source should be preferred? Consider:\n"
            f"- Official DB/manufacturer specs are usually more accurate than older entries\n"
            f"- More recent data may reflect updates\n"
            f"- If unable to determine with confidence, mark as 'pending'\n\n"
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
            conflict_resolved["preferred_source"] = result.get("preferred_source", new_src)
            resolved.append(conflict_resolved)
        except Exception as e:
            print(f"  Error resolving conflict for '{prod_slug}': {e}")
            resolved.append(conflict)

    pending_count = sum(1 for c in resolved if c.get("resolution") == "pending")
    resolved_count = len(resolved) - pending_count
    print(f"  Conflicts processed: {resolved_count} resolved, {pending_count} pending")

    return {"contradictions": resolved}
