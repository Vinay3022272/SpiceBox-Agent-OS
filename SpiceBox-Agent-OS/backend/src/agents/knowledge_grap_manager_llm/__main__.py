"""
CLI runner for the Knowledge Graph Manager Agent.

Usage:
    cd backend
    python -m src.agents.knowledge_grap_manager_llm --wiki ./merchant_knowledge --merchant test_merchant

Options:
    --source    Optional path to a CSV file or directory of CSV files for testing
    --wiki      Path to the wiki base directory (default: ./merchant_knowledge)
    --section   Wiki section: "knowledge" or "marketing" (default: knowledge)
    --merchant  Merchant ID (default: test_merchant)
    --both      Process both knowledge and marketing sections
    --query     Query/Question to read detail from the knowledge base
    --interactive Start interactive query session
"""

import argparse
import sys
import os
from pathlib import Path

# Add the backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from src.agents.knowledge_grap_manager_llm import run_wiki_agent, query_wiki


def _load_source_data(source_path: str, default_category: str = "catalog") -> list[dict]:
    """Helper to convert local files/folders to collected_data records for CLI test."""
    p = Path(source_path)
    records = []
    if p.is_file():
        content = p.read_text(encoding="utf-8")
        cat = default_category
        name_lower = p.name.lower()
        if "review" in name_lower:
            cat = "review"
        elif "promotion" in name_lower or "discount" in name_lower:
            cat = "promotion"
        records.append({"category": cat, "data": content, "format": "csv"})
    elif p.is_dir():
        for f in p.rglob("*.csv"):
            content = f.read_text(encoding="utf-8")
            cat = default_category
            name_lower = f.name.lower()
            if "review" in name_lower:
                cat = "review"
            elif "promotion" in name_lower or "discount" in name_lower:
                cat = "promotion"
            records.append({"category": cat, "data": content, "format": "csv"})
    return records


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')

    parser = argparse.ArgumentParser(
        description="Knowledge Graph Manager Agent — LLM Wiki Maintainer & Query Interface",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--source", "-s",
        required=False,
        help="Optional path to a CSV file or directory of CSV files for testing data ingestion",
    )
    parser.add_argument(
        "--wiki", "-w",
        default="./merchant_knowledge",
        help="Path to the wiki base directory (default: ./merchant_knowledge)",
    )
    parser.add_argument(
        "--section",
        choices=["knowledge", "marketing"],
        default="knowledge",
        help="Wiki section to process/query (default: knowledge)",
    )
    parser.add_argument(
        "--merchant", "-m",
        default="test_merchant",
        help="Merchant ID (default: test_merchant)",
    )
    parser.add_argument(
        "--both", "-b",
        action="store_true",
        help="Process both knowledge and marketing sections during write pipeline",
    )
    parser.add_argument(
        "--query", "-q",
        type=str,
        help="Query/Question to read detail from the Knowledge Graph Wiki",
    )
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="Start an interactive query session to read details from the Knowledge Graph Wiki",
    )

    args = parser.parse_args()

    # READ PIPELINE: Interactive mode
    if args.interactive:
        print(f"\n{'='*60}")
        print(f"  Knowledge Graph Manager — Interactive Query Reader")
        print(f"  Wiki Path: {args.wiki}")
        print(f"  Merchant: {args.merchant}")
        print(f"  Type 'exit' or 'quit' to stop.")
        print(f"{'='*60}\n")

        while True:
            try:
                q = input("\n[Query Knowledge Graph] > ").strip()
                if not q:
                    continue
                if q.lower() in ("exit", "quit"):
                    print("Exiting query mode. Goodbye!")
                    break

                res = query_wiki(
                    query=q,
                    wiki_base_path=args.wiki,
                    merchant_id=args.merchant,
                    section=args.section,
                )
                print(f"\n--- Answer ({len(res['sources'])} pages cited) ---")
                print(res["answer"])
                if res["sources"]:
                    print("\nCited Sources:")
                    for src in res["sources"]:
                        print(f" - {src}")
            except (KeyboardInterrupt, EOFError):
                print("\nExiting query mode.")
                break
        return

    # READ PIPELINE: Single Query mode
    if args.query:
        print(f"\n{'='*60}")
        print(f"  Knowledge Graph Manager — Reading Knowledge Wiki")
        print(f"  Query: {args.query}")
        print(f"  Wiki Path: {args.wiki}")
        print(f"{'='*60}\n")

        res = query_wiki(
            query=args.query,
            wiki_base_path=args.wiki,
            merchant_id=args.merchant,
            section=args.section,
        )

        print(f"\n--- Answer ---")
        print(res["answer"])
        if res["sources"]:
            print(f"\nCited Sources ({len(res['sources'])} files):")
            for src in res["sources"]:
                print(f" - {src}")
        return

    # WRITE PIPELINE: Ingestion & maintenance
    collected_data = []
    if args.source:
        if not os.path.exists(args.source):
            print(f" Source path not found: {args.source}")
            sys.exit(1)
        collected_data = _load_source_data(args.source)

    section_to_run = "both" if args.both else args.section
    run_wiki_agent(
        merchant_id=args.merchant,
        wiki_base_path=args.wiki,
        wiki_section=section_to_run,
        collected_data=collected_data,
    )


if __name__ == "__main__":
    main()
