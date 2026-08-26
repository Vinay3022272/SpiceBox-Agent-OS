"""
WikiState — the central state object that flows through the LangGraph.

Two wiki sections share the same state shape:
  - "knowledge"  → product facts, specs, reviews, categories
  - "marketing"  → promotions, specialties, popular items, revenue boosters

The `wiki_section` field determines which sub-directory the agent operates on.
"""

from __future__ import annotations
from typing import TypedDict, Literal, Any


class SourceFile(TypedDict):
    """Metadata for a single raw source file."""
    path: str
    filename: str
    extension: str
    size_bytes: int
    category: str  # catalog | review | document | image | promotion | specialty


class ExtractedProduct(TypedDict):
    """A product entity extracted from a source."""
    name: str
    slug: str  # canonical ID, e.g. "iphone-15"
    brand: str
    category: str
    price: str
    currency: str
    description: str
    specifications: dict[str, str]
    source_file: str
    raw_data: dict[str, Any]


class ExtractedReview(TypedDict):
    """A review record extracted from a CSV."""
    product_slug: str
    product_name: str
    rating: float
    title: str
    body: str
    reviewer: str
    date: str
    source_file: str


class ReviewSynthesis(TypedDict):
    """Synthesized review data for a product."""
    product_slug: str
    product_name: str
    avg_rating: float
    total_reviews: int
    sentiment_summary: str
    top_pros: list[str]
    top_cons: list[str]
    best_reviews: list[dict[str, str]]


class WikiPage(TypedDict):
    """Represents a wiki page to create or update."""
    slug: str
    title: str
    page_type: str  # product | category | review | insight | promotion | specialty | popular
    section: str  # knowledge | marketing
    file_path: str
    content: str
    sources: list[str]
    links: list[str]


class Contradiction(TypedDict):
    """A contradiction detected between sources."""
    product_slug: str
    field: str
    existing_value: str
    new_value: str
    existing_source: str
    new_source: str
    resolution: str  # pending | resolved
    preferred_source: str


class LogEntry(TypedDict):
    """A single log entry for log.md."""
    timestamp: str
    operation: str  # ingest | update | lint
    section: str  # knowledge | marketing
    files_processed: list[str]
    products_added: int
    products_updated: int
    reviews_processed: int
    pages_created: list[str]
    pages_updated: list[str]
    conflicts: int
    status: str  # SUCCESS | PARTIAL | FAILED
    errors: list[str]


class ValidationResult(TypedDict):
    """Result from wiki validation / lint."""
    orphan_pages: list[str]
    duplicate_products: list[str]
    missing_reviews: list[str]
    conflicting_specs: list[str]
    outdated_prices: list[str]
    broken_links: list[str]
    health_score: float  # 0.0 - 1.0


class WikiState(TypedDict):
    """
    Central state that flows through all LangGraph nodes.

    Both 'knowledge' and 'marketing' sections use this same state.
    The `wiki_section` field controls which sub-directory is targeted.
    """

    # ── Identity ──
    merchant_id: str
    wiki_section: str  # "knowledge" | "marketing"

    # ── Paths ──
    source_dir: str  # where uploaded files are
    wiki_base_path: str  # root of merchant_knowledge/

    # ── Source scanning ──
    uploaded_files: list[SourceFile]
    classified_sources: dict[str, list[SourceFile]]  # category -> files

    # ── Extraction ──
    extracted_products: list[ExtractedProduct]
    extracted_reviews: list[ExtractedReview]
    review_syntheses: list[ReviewSynthesis]

    # ── Wiki maintenance ──
    entities: list[dict[str, Any]]
    existing_pages: dict[str, str]  # slug -> file_path
    pages_to_create: list[WikiPage]
    pages_to_update: list[WikiPage]
    contradictions: list[Contradiction]

    # ── Output ──
    generated_pages: list[WikiPage]
    index_updates: list[dict[str, str]]
    log_entry: LogEntry
    validation_result: ValidationResult

    # ── Control ──
    validation_errors: list[str]
    status: str  # running | success | failed
    error: str
