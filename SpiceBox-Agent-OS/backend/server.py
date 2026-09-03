"""
server.py — Lightweight HTTP runner for Merchant Knowledge Wiki generation.
Runs on port 8002, accessible by Medusa Admin backend to trigger wiki generation.
"""

import os
import json
import threading
import time
import urllib.parse
from datetime import datetime
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler

# Ensure backend root is in sys.path
import sys
BACKEND_DIR = Path(__file__).resolve().parent
if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))

from src.agents.knowledge_grap_manager_llm import run_wiki_agent

PORT = int(os.getenv("WIKI_SERVER_PORT", "8002"))
WIKI_PATH = str(BACKEND_DIR / "merchant_knowledge")

# Global generation state
generation_state = {
    "status": "idle",       # "idle", "running", "success", "error"
    "last_run": None,
    "last_duration_sec": 0,
    "current_stage": None,
    "page_count": 0,
    "error": None,
    "log": "",
}


def _calculate_wiki_stats() -> tuple[int, str]:
    """Count generated pages and read last updated time from index.md."""
    index_file = Path(WIKI_PATH) / "wiki" / "index.md"
    page_count = 0
    last_updated = ""

    if index_file.exists():
        try:
            content = index_file.read_text(encoding="utf-8")
            for line in content.splitlines():
                if line.strip().startswith("- ["):
                    page_count += 1
                if "_Last updated:" in line:
                    last_updated = line.replace("_Last updated:", "").replace("_", "").strip()
        except Exception:
            pass

    return page_count, last_updated


def _parse_frontmatter(content: str) -> tuple[dict, str]:
    """Parse YAML frontmatter and body from markdown content."""
    meta = {}
    body = content
    if content.startswith("---"):
        parts = content.split("---", 2)
        if len(parts) >= 3:
            raw_fm = parts[1]
            body = parts[2].strip()
            for line in raw_fm.splitlines():
                if ":" in line:
                    k, v = line.split(":", 1)
                    meta[k.strip()] = v.strip().strip("'\"")
    return meta, body


def _get_wiki_tree() -> dict:
    """Scan merchant_knowledge/wiki/ and return structured tree of all dossiers."""
    import re
    wiki_root = Path(WIKI_PATH) / "wiki"
    if not wiki_root.exists():
        return {"total_pages": 0, "categories": {}, "pages": []}

    pages = []
    category_counts = {
        "products": 0,
        "categories": 0,
        "popular": 0,
        "promotions": 0,
        "specialties": 0,
        "system": 0,
    }

    for md_file in sorted(wiki_root.rglob("*.md")):
        rel_path = str(md_file.relative_to(wiki_root))
        try:
            content = md_file.read_text(encoding="utf-8")
        except Exception:
            continue

        meta, body = _parse_frontmatter(content)
        title = meta.get("name")
        if not title:
            # Fallback to first H1
            for line in body.splitlines():
                if line.startswith("# "):
                    title = line[2:].strip().replace(" — Popular Item", "").replace(" — Popular Item Intelligence", "")
                    break
        if not title:
            title = md_file.stem.replace("-", " ").title()

        # Determine section/group
        group = "products"
        if "categories/" in rel_path:
            group = "categories"
        elif "popular/" in rel_path:
            group = "popular"
        elif "promotions/" in rel_path:
            group = "promotions"
        elif "specialties/" in rel_path:
            group = "specialties"
        elif rel_path in ("index.md", "log.md"):
            group = "system"

        category_counts[group] = category_counts.get(group, 0) + 1

        price = meta.get("price", "")
        if not price:
            p_match = re.search(r"-\s*\*\*Price\*\*:\s*([0-9.]+)", content)
            if p_match:
                price = p_match.group(1)

        rating = None
        clean_content = content.replace("**", "").replace("__", "")
        r_match = re.search(r"Average Rating:\s*([0-9.]+)/5", clean_content)
        if not r_match:
            r_match = re.search(r"Rating:\s*([0-9.]+)/5", clean_content)
        if r_match:
            try:
                rating = float(r_match.group(1))
            except Exception:
                pass

        pages.append({
            "path": rel_path,
            "title": title,
            "slug": meta.get("slug", md_file.stem),
            "group": group,
            "section": "knowledge" if "knowledge/" in rel_path else ("marketing" if "marketing/" in rel_path else "system"),
            "section_label": "Catalog" if "knowledge/products" in rel_path else ("Category" if "knowledge/categories" in rel_path else ("Marketing" if "marketing/" in rel_path else "System")),
            "category": meta.get("category", ""),
            "brand": meta.get("brand", ""),
            "price": price,
            "rating": rating,
            "last_updated": meta.get("last_updated", ""),
            "size_bytes": md_file.stat().st_size,
        })

    return {
        "total_pages": len(pages),
        "group_counts": category_counts,
        "pages": pages,
    }


def _get_wiki_page(rel_path: str) -> dict | None:
    """Read a markdown wiki page and parse structured sections for non-developer UI."""
    import re
    wiki_root = Path(WIKI_PATH) / "wiki"
    target = (wiki_root / rel_path).resolve()

    # Security check: ensure target is within wiki_root
    try:
        target.relative_to(wiki_root)
    except ValueError:
        return None

    if not target.exists() or not target.is_file():
        return None

    try:
        raw_content = target.read_text(encoding="utf-8")
    except Exception:
        return None

    meta, body = _parse_frontmatter(raw_content)

    # Clean out leading H1 titles from body so they do not leak into Overview
    body_lines = body.splitlines()
    while body_lines and (body_lines[0].startswith("# ") or not body_lines[0].strip()):
        body_lines.pop(0)

    # Parse sections from body
    sections = {}
    current_section = "Overview"
    section_lines = []

    for line in body_lines:
        if line.startswith("## "):
            if section_lines:
                sections[current_section] = "\n".join(section_lines).strip()
            current_section = line[3:].strip()
            section_lines = []
        else:
            section_lines.append(line)
    if section_lines:
        sections[current_section] = "\n".join(section_lines).strip()

    # Extract price from frontmatter or text
    price = meta.get("price", "")
    if not price:
        p_match = re.search(r"-\s*\*\*Price\*\*:\s*([0-9.]+)", raw_content)
        if p_match:
            price = p_match.group(1)

    # Extract sentiment details if present
    sentiment_data = {
        "rating": None,
        "review_count": None,
        "highlights": [],
        "pros": [],
        "cons": [],
    }

    sentiment_text = sections.get("Customer Sentiment", "") or sections.get("Customer Highlights", "")
    if sentiment_text:
        clean_text = sentiment_text.replace("**", "").replace("__", "")
        rating_match = re.search(r"(?:Average Rating|Overall Rating|Rating):\s*([0-9.]+)/5(?:\s*\(([0-9]+)\s*review)?", clean_text, re.IGNORECASE)
        if rating_match:
            try:
                sentiment_data["rating"] = float(rating_match.group(1))
                sentiment_data["review_count"] = int(rating_match.group(2)) if rating_match.group(2) else 1
            except Exception:
                pass

        current_sub = None
        for line in sentiment_text.splitlines():
            line_s = line.strip()
            if not line_s:
                continue
            if line_s.startswith("### "):
                header_sub = line_s[4:].lower()
                if any(w in header_sub for w in ["like", "pros", "strengths"]):
                    current_sub = "pros"
                elif any(w in header_sub for w in ["complaint", "cons", "issues", "notes"]):
                    current_sub = "cons"
                elif any(w in header_sub for w in ["review", "highlight"]):
                    current_sub = "highlights"
                else:
                    current_sub = None
                continue

            if line_s.startswith("> "):
                clean_quote = line_s[2:].strip().replace('"', '').replace('**', '')
                clean_quote = re.sub(r"📄\s*\S+", "", clean_quote).strip()
                if clean_quote and clean_quote not in sentiment_data["highlights"]:
                    sentiment_data["highlights"].append(clean_quote)
            elif current_sub == "pros" and line_s.startswith("- "):
                pro_item = line_s[2:].strip().replace('**', '').rstrip(".")
                if pro_item and pro_item not in sentiment_data["pros"]:
                    sentiment_data["pros"].append(pro_item)
            elif current_sub == "cons" and line_s.startswith("- "):
                con_item = line_s[2:].strip().replace('**', '').rstrip(".")
                if con_item and con_item not in sentiment_data["cons"]:
                    sentiment_data["cons"].append(con_item)
            else:
                line_clean = line_s.replace("**", "").replace("__", "")
                if line_clean.lower().startswith(("- pros:", "pros:")):
                    parts = line_clean.split(":", 1)[1]
                    sentiment_data["pros"].extend([p.strip().rstrip(".") for p in parts.split(",") if p.strip()])
                elif line_clean.lower().startswith(("- cons:", "cons:")):
                    parts = line_clean.split(":", 1)[1]
                    sentiment_data["cons"].extend([c.strip().rstrip(".") for c in parts.split(",") if c.strip()])

    # Cross-dossier linkage
    slug = meta.get("slug") or target.stem
    primary_product_path = None
    marketing_intelligence_path = None

    if "marketing/" in rel_path:
        prod_target = wiki_root / "knowledge" / "products" / f"{slug}.md"
        if prod_target.exists():
            primary_product_path = f"knowledge/products/{slug}.md"
            # If marketing has no rating yet, inherit reviews and price from primary product dossier
            if sentiment_data["rating"] is None:
                try:
                    p_content = prod_target.read_text(encoding="utf-8")
                    p_meta, p_body = _parse_frontmatter(p_content)
                    if not price and p_meta.get("price"):
                        price = p_meta.get("price")
                    p_clean = p_body.replace("**", "").replace("__", "")
                    p_rat = re.search(r"Average Rating:\s*([0-9.]+)/5(?:\s*\(([0-9]+)\s*review)?", p_clean, re.IGNORECASE)
                    if p_rat:
                        sentiment_data["rating"] = float(p_rat.group(1))
                        sentiment_data["review_count"] = int(p_rat.group(2)) if p_rat.group(2) else 1
                    for line in p_body.splitlines():
                        if line.strip().startswith("> "):
                            q = line.strip()[2:].strip().replace('"', '')
                            q = re.sub(r"📄\s*\S+", "", q).strip()
                            sentiment_data["highlights"].append(q)
                        else:
                            lc = line.strip().replace("**", "").replace("__", "")
                            if lc.lower().startswith(("- pros:", "pros:")):
                                pts = lc.split(":", 1)[1]
                                sentiment_data["pros"].extend([p.strip().rstrip(".") for p in pts.split(",") if p.strip()])
                            elif lc.lower().startswith(("- cons:", "cons:")):
                                pts = lc.split(":", 1)[1]
                                sentiment_data["cons"].extend([c.strip().rstrip(".") for c in pts.split(",") if c.strip()])
                except Exception:
                    pass
    elif "knowledge/products/" in rel_path:
        mkt_target = wiki_root / "marketing" / "popular" / f"{slug}.md"
        if mkt_target.exists():
            marketing_intelligence_path = f"marketing/popular/{slug}.md"

    # Extract related links
    related_links = []
    related_text = sections.get("Related", "")
    if related_text:
        for line in related_text.splitlines():
            match = re.search(r"\[([^\]]+)\]\(([^)]+)\)\s*(?:\(([^)]+)\))?", line)
            if match:
                related_links.append({
                    "title": match.group(1),
                    "target": match.group(2),
                    "type": match.group(3) or "Related",
                })

    return {
        "path": rel_path,
        "raw": raw_content,
        "frontmatter": meta,
        "title": meta.get("name") or target.stem.replace("-", " ").title(),
        "price": price,
        "sections": sections,
        "sentiment": sentiment_data,
        "related_links": related_links,
        "primary_product_path": primary_product_path,
        "marketing_intelligence_path": marketing_intelligence_path,
        "last_modified": datetime.fromtimestamp(target.stat().st_mtime).strftime("%Y-%m-%d %H:%M"),
    }


def _get_wiki_graph() -> dict:
    """Extract complete knowledge graph nodes and relational links for Neo4j visualization."""
    import re
    wiki_root = Path(WIKI_PATH) / "wiki"
    if not wiki_root.exists():
        return {"nodes": [], "links": [], "categories": []}

    prod_dir = wiki_root / "knowledge" / "products"
    cat_dir = wiki_root / "knowledge" / "categories"

    nodes_dict = {}
    links = []
    category_set = set()

    # 1. Discover all categories
    if cat_dir.exists():
        for c_file in cat_dir.glob("*.md"):
            c_slug = c_file.stem
            try:
                c_content = c_file.read_text(encoding="utf-8")
                c_meta, c_body = _parse_frontmatter(c_content)
                c_name = c_meta.get("name")
                if not c_name:
                    for line in c_body.splitlines():
                        if line.startswith("# "):
                            c_name = line[2:].strip()
                            break
                if not c_name:
                    c_name = c_slug.replace("-", " ").title()

                cat_id = f"cat_{c_slug}"
                nodes_dict[cat_id] = {
                    "id": cat_id,
                    "slug": c_slug,
                    "name": c_name,
                    "type": "category",
                    "path": f"knowledge/categories/{c_slug}.md",
                    "product_count": 0,
                    "radius": 24,
                    "color": "#18181b",
                }
                category_set.add(c_slug)
            except Exception:
                pass

    # 2. Discover all products & links
    if prod_dir.exists():
        for p_file in prod_dir.glob("*.md"):
            p_slug = p_file.stem
            try:
                p_content = p_file.read_text(encoding="utf-8")
                p_meta, p_body = _parse_frontmatter(p_content)
                p_name = p_meta.get("name")
                if not p_name:
                    for line in p_body.splitlines():
                        if line.startswith("# "):
                            p_name = line[2:].strip()
                            break
                if not p_name:
                    p_name = p_slug.replace("-", " ").title()

                cat_name = p_meta.get("category", "")
                cat_slug = cat_name.lower().replace(" & ", "-").replace("&", "-").replace(" ", "-").replace("'", "")

                price = p_meta.get("price", "")
                if not price:
                    p_match = re.search(r"-\s*\*\*Price\*\*:\s*([0-9.]+)", p_content)
                    if p_match:
                        price = p_match.group(1)

                rating = None
                p_clean = p_content.replace("**", "").replace("__", "")
                r_match = re.search(r"(?:Average Rating|Overall Rating|Rating):\s*([0-9.]+)/5", p_clean)
                if r_match:
                    try:
                        rating = float(r_match.group(1))
                    except Exception:
                        pass

                prod_id = f"prod_{p_slug}"
                nodes_dict[prod_id] = {
                    "id": prod_id,
                    "slug": p_slug,
                    "name": p_name,
                    "type": "product",
                    "category": cat_name,
                    "category_slug": cat_slug,
                    "price": price,
                    "rating": rating,
                    "brand": p_meta.get("brand", "SpiceBox"),
                    "path": f"knowledge/products/{p_slug}.md",
                    "radius": 14 if rating else 11,
                    "color": "#09090b",
                }

                # Link to category
                cat_id = f"cat_{cat_slug}"
                if cat_id not in nodes_dict and cat_name:
                    nodes_dict[cat_id] = {
                        "id": cat_id,
                        "slug": cat_slug,
                        "name": cat_name,
                        "type": "category",
                        "path": f"knowledge/categories/{cat_slug}.md",
                        "product_count": 0,
                        "radius": 24,
                        "color": "#18181b",
                    }
                    category_set.add(cat_slug)

                if cat_id in nodes_dict:
                    nodes_dict[cat_id]["product_count"] = nodes_dict[cat_id].get("product_count", 0) + 1
                    links.append({
                        "id": f"{prod_id}->{cat_id}",
                        "source": prod_id,
                        "target": cat_id,
                        "type": "BELONGS_TO",
                        "label": "IN_CATEGORY",
                    })

                # Extract Alternative & Peer links from ## Related
                for line in p_body.splitlines():
                    if "Alternative" in line or "Related" in line:
                        match = re.search(r"\[([^\]]+)\]\(([^)]+)\)", line)
                        if match:
                            target_url = match.group(2)
                            target_slug = target_url.split("/")[-1].replace(".md", "")
                            target_id = f"prod_{target_slug}"
                            if target_slug and target_slug != p_slug:
                                link_id = f"{prod_id}<->{target_id}" if prod_id < target_id else f"{target_id}<->{prod_id}"
                                links.append({
                                    "id": link_id,
                                    "source": prod_id,
                                    "target": target_id,
                                    "type": "ALTERNATIVE_TO",
                                    "label": "ALTERNATIVE",
                                })
            except Exception:
                pass

    # Deduplicate links & guarantee source/target exist
    unique_links = []
    seen_link_ids = set()
    node_ids = set(nodes_dict.keys())
    for l in links:
        if l["source"] in node_ids and l["target"] in node_ids:
            if l["id"] not in seen_link_ids:
                seen_link_ids.add(l["id"])
                unique_links.append(l)

    return {
        "nodes": list(nodes_dict.values()),
        "links": unique_links,
        "categories": sorted(list(category_set)),
        "stats": {
            "total_nodes": len(nodes_dict),
            "total_links": len(unique_links),
        }
    }


# Initialize stats from existing wiki
init_count, init_updated = _calculate_wiki_stats()
if init_count > 0:
    generation_state["page_count"] = init_count
    generation_state["last_run"] = init_updated
    generation_state["status"] = "success"


def _run_pipeline_job(merchant_id: str = "default_merchant", section: str = "both"):
    """Background worker delegating entire wiki generation to the autonomous Wiki Agent."""
    global generation_state
    start_time = time.time()
    generation_state["status"] = "running"
    generation_state["error"] = None
    generation_state["current_stage"] = "Agent initializing..."

    def on_agent_stage(stage_name: str, step_data: dict):
        """Live progress callback receiving actual node transitions from the running agent."""
        generation_state["current_stage"] = stage_name
        print(f"  [Agent Stream] {stage_name}")

    try:
        # Single autonomous agent invocation handles section orchestration and graph streaming
        final_state = run_wiki_agent(
            merchant_id=merchant_id,
            wiki_base_path=WIKI_PATH,
            wiki_section=section,
            on_progress=on_agent_stage,
        )

        duration = round(time.time() - start_time, 1)
        count, updated = _calculate_wiki_stats()

        generation_state["status"] = "success"
        generation_state["last_run"] = updated or datetime.now().strftime("%Y-%m-%d %H:%M")
        generation_state["last_duration_sec"] = duration
        generation_state["page_count"] = count
        generation_state["current_stage"] = f"Completed successfully in {duration}s"

    except Exception as e:
        import traceback
        traceback.print_exc()
        duration = round(time.time() - start_time, 1)
        generation_state["status"] = "error"
        generation_state["error"] = str(e)
        generation_state["last_duration_sec"] = duration
        generation_state["current_stage"] = f"Failed after {duration}s: {str(e)}"
        print(f"  [WikiServer] Generation error: {e}")


class WikiRequestHandler(BaseHTTPRequestHandler):
    def _send_json(self, data: dict, status: int = 200):
        body = json.dumps(data).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.end_headers()

    def do_GET(self):
        parsed_url = urllib.parse.urlparse(self.path)
        path = parsed_url.path
        query = urllib.parse.parse_qs(parsed_url.query)

        if path in ("/health", "/"):
            self._send_json({"status": "ok", "service": "merchant-wiki-runner"})
            return

        if path in ("/status", "/admin/status"):
            count, updated = _calculate_wiki_stats()
            state_copy = dict(generation_state)
            if count > 0:
                state_copy["page_count"] = count
                if updated and not state_copy["last_run"]:
                    state_copy["last_run"] = updated
            self._send_json(state_copy)
            return

        if path in ("/wiki/tree", "/admin/wiki/tree"):
            tree = _get_wiki_tree()
            self._send_json(tree)
            return

        if path in ("/wiki/page", "/admin/wiki/page"):
            rel_path = query.get("path", [""])[0].strip()
            if not rel_path:
                self._send_json({"error": "Path parameter required"}, status=400)
                return
            page_data = _get_wiki_page(rel_path)
            if not page_data:
                self._send_json({"error": "Page not found"}, status=404)
                return
            self._send_json(page_data)
            return

        if path in ("/wiki/graph", "/admin/wiki/graph"):
            graph_data = _get_wiki_graph()
            self._send_json(graph_data)
            return

        self._send_json({"error": "Not Found"}, status=404)

    def do_POST(self):
        path = self.path.split("?")[0]

        if path in ("/chat", "/api/chat"):
            content_len = int(self.headers.get("Content-Length", 0))
            payload = {}
            if content_len > 0:
                try:
                    body_raw = self.rfile.read(content_len).decode("utf-8")
                    payload = json.loads(body_raw)
                except Exception:
                    pass

            raw_messages = payload.get("messages", [])
            merchant_id = payload.get("merchant_id", "default_merchant")
            user_id = payload.get("user_id", "customer_default")

            if not raw_messages:
                self._send_json({"error": "No messages provided"}, status=400)
                return

            try:
                from langchain_core.messages import HumanMessage, AIMessage
                from src.agents.merchant_llm import invoke_merchant_agent
                from src.agents.merchant_llm.utils.cart import sync_cart_state, get_cart_data

                # Sync incoming cart state from the real Medusa store cart
                external_cart = payload.get("cart", {})
                external_items = external_cart.get("items", []) if isinstance(external_cart, dict) else []
                external_address = external_cart.get("shipping_address") if isinstance(external_cart, dict) else None
                saved_addresses = payload.get("saved_addresses", [])
                sync_cart_state(external_items, shipping_address=external_address, saved_addresses=saved_addresses)

                lc_messages = []
                for m in raw_messages:
                    role = m.get("role", "user")
                    content = m.get("content", "")
                    if role == "user":
                        lc_messages.append(HumanMessage(content=content))
                    elif role == "assistant":
                        lc_messages.append(AIMessage(content=content))

                # Invoke the LangGraph merchant agent
                result = invoke_merchant_agent(
                    messages=lc_messages,
                    merchant_id=merchant_id,
                    user_id=user_id,
                )

                response_content = ""
                if result.get("messages"):
                    response_content = result["messages"][-1].content

                latest_cart = get_cart_data()

                self._send_json({
                    "success": True,
                    "response": response_content,
                    "cart": latest_cart,
                    "actions": latest_cart.get("last_actions", []),
                })
            except Exception as e:
                import traceback
                traceback.print_exc()
                self._send_json({
                    "success": False,
                    "error": str(e),
                    "response": f"I had a slight hiccup looking up our store records: {str(e)}. Could you ask that again?"
                }, status=500)
            return

        if path in ("/generate", "/admin/generate"):
            if generation_state["status"] == "running":
                self._send_json({
                    "success": False,
                    "message": "Wiki generation is already in progress.",
                    "state": generation_state
                }, status=409)
                return

            # Read optional body params
            content_len = int(self.headers.get("Content-Length", 0))
            payload = {}
            if content_len > 0:
                try:
                    body_raw = self.rfile.read(content_len).decode("utf-8")
                    payload = json.loads(body_raw)
                except Exception:
                    pass

            merchant_id = payload.get("merchant_id", "default_merchant")
            section = payload.get("section", "both")

            # Launch background worker
            thread = threading.Thread(
                target=_run_pipeline_job,
                kwargs={"merchant_id": merchant_id, "section": section},
                daemon=True
            )
            thread.start()

            self._send_json({
                "success": True,
                "message": "Wiki generation initiated in background.",
                "state": {
                    "status": "running",
                    "current_stage": "Starting extraction...",
                    "merchant_id": merchant_id,
                }
            }, status=202)
            return

        self._send_json({"error": "Not Found"}, status=404)

    def log_message(self, format, *args):
        # Clean logging
        print(f"[WikiServer] {args[0]} - {args[1]}")


def run_server():
    server_address = ("0.0.0.0", PORT)
    httpd = HTTPServer(server_address, WikiRequestHandler)
    print(f"✔ Merchant Wiki Runner Server started at http://0.0.0.0:{PORT}")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down Wiki Server...")
        httpd.server_close()


if __name__ == "__main__":
    run_server()
