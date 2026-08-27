"""
CLI runner for the Store Managing Agent.

Usage:
    cd backend
    python -m src.agents.store_managing_agent --source ./test_data --wiki ./merchant_knowledge

Options:
    --source    Path to the folder with source files
    --wiki      Path to the wiki base directory
    --section   Wiki section: "knowledge" or "marketing" (default: knowledge)
    --merchant  Merchant ID (default: test_merchant)
    --both      Process both knowledge and marketing sections
"""

import argparse
import sys
import os

# Add the backend directory to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "..", ".."))

from src.agents.store_manager_llm import run_wiki_agent, query_wiki


def main():
    if hasattr(sys.stdout, 'reconfigure'):
        sys.stdout.reconfigure(encoding='utf-8')
    if hasattr(sys.stderr, 'reconfigure'):
        sys.stderr.reconfigure(encoding='utf-8')

    parser = argparse.ArgumentParser(
        description="Store Managing Agent — LLM Wiki Maintainer & Query Interface",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )

    parser.add_argument(
        "--source", "-s",
        required=False,
        help="Path to the folder with source files (CSV, PDF, etc.) for write pipeline",
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
        help="Query/Question to read detail from the Store Manager LLM Knowledge Base",
    )
    parser.add_argument(
        "--interactive", "-i",
        action="store_true",
        help="Start an interactive query session to read details from the Store Manager LLM Knowledge Base",
    )

    args = parser.parse_args()

    # READ PIPELINE: Interactive mode
    if args.interactive:
        print(f"\n{'='*60}")
        print(f"  Store Manager LLM — Interactive Query Reader")
        print(f"  Wiki Path: {args.wiki}")
        print(f"  Merchant: {args.merchant}")
        print(f"  Type 'exit' or 'quit' to stop.")
        print(f"{'='*60}\n")

        while True:
            try:
                q = input("\n[Query Store Manager] > ").strip()
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
        print(f"  Store Manager LLM — Reading Knowledge Wiki")
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
    if not args.source:
        parser.error("--source (-s) is required for write pipeline unless --query (-q) or --interactive (-i) is specified.")

    if not os.path.exists(args.source):
        print(f" Source directory not found: {args.source}")
        sys.exit(1)

    if args.both:
        # Run both sections
        print("\n Processing KNOWLEDGE section...\n")
        run_wiki_agent(
            merchant_id=args.merchant,
            source_folder=args.source,
            wiki_base_path=args.wiki,
            wiki_section="knowledge",
        )

        print("\n Processing MARKETING section...\n")
        run_wiki_agent(
            merchant_id=args.merchant,
            source_folder=args.source,
            wiki_base_path=args.wiki,
            wiki_section="marketing",
        )
    else:
        run_wiki_agent(
            merchant_id=args.merchant,
            source_folder=args.source,
            wiki_base_path=args.wiki,
            wiki_section=args.section,
        )


if __name__ == "__main__":
    main()

