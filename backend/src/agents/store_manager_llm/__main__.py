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

from src.agents.store_manager_llm import run_wiki_agent


def main():
    parser = argparse.ArgumentParser(
        description="Store Managing Agent — LLM Wiki Maintainer",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument(
        "--source", "-s",
        required=True,
        help="Path to the folder with source files (CSV, PDF, etc.)",
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
        help="Wiki section to process (default: knowledge)",
    )
    parser.add_argument(
        "--merchant", "-m",
        default="test_merchant",
        help="Merchant ID (default: test_merchant)",
    )
    parser.add_argument(
        "--both", "-b",
        action="store_true",
        help="Process both knowledge and marketing sections",
    )

    args = parser.parse_args()

    # Validate source directory
    if not os.path.exists(args.source):
        print(f"❌ Source directory not found: {args.source}")
        sys.exit(1)

    if args.both:
        # Run both sections
        print("\n🔄 Processing KNOWLEDGE section...\n")
        run_wiki_agent(
            merchant_id=args.merchant,
            source_folder=args.source,
            wiki_base_path=args.wiki,
            wiki_section="knowledge",
        )

        print("\n🔄 Processing MARKETING section...\n")
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
