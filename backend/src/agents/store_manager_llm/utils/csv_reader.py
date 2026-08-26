"""
csv_reader.py — Parse CSV and Excel files into structured data.
"""

import pandas as pd
from pathlib import Path


def read_csv(file_path: str) -> list[dict]:
    """
    Read a CSV file and return list of row dicts.
    Handles common encodings and separators.
    """
    p = Path(file_path)
    ext = p.suffix.lower()

    if ext in (".xlsx", ".xls"):
        df = pd.read_excel(file_path)
    else:
        # Try comma first, then semicolon, then tab
        for sep in [",", ";", "\t"]:
            try:
                df = pd.read_csv(file_path, sep=sep, encoding="utf-8")
                if len(df.columns) > 1:
                    break
            except Exception:
                try:
                    df = pd.read_csv(file_path, sep=sep, encoding="latin-1")
                    if len(df.columns) > 1:
                        break
                except Exception:
                    continue
        else:
            df = pd.read_csv(file_path)

    # Clean column names
    df.columns = df.columns.str.strip().str.lower().str.replace(" ", "_")

    # Drop fully empty rows
    df = df.dropna(how="all")

    return df.to_dict(orient="records")


def detect_csv_type(file_path: str) -> str:
    """
    Heuristically detect if a CSV contains product catalog data or review data.
    Returns 'catalog' or 'review' or 'unknown'.
    """
    try:
        df = pd.read_csv(file_path, nrows=5)
        cols = set(df.columns.str.strip().str.lower())

        review_indicators = {"rating", "review", "comment", "feedback", "stars", "reviewer", "review_text", "review_title"}
        catalog_indicators = {"product", "price", "category", "brand", "sku", "name", "description", "specifications"}
        promotion_indicators = {"promotion", "discount", "offer", "deal", "special", "popular", "featured", "bestseller"}

        review_score = len(cols & review_indicators)
        catalog_score = len(cols & catalog_indicators)
        promotion_score = len(cols & promotion_indicators)

        if promotion_score >= 2:
            return "promotion"
        if review_score > catalog_score:
            return "review"
        if catalog_score > 0:
            return "catalog"
        return "unknown"
    except Exception:
        return "unknown"


def get_csv_summary(file_path: str) -> dict:
    """Get a summary of a CSV file: columns, row count, sample."""
    try:
        df = pd.read_csv(file_path, nrows=100)
        return {
            "columns": list(df.columns),
            "row_count": len(df),
            "sample_rows": df.head(3).to_dict(orient="records"),
            "dtypes": {col: str(dtype) for col, dtype in df.dtypes.items()},
        }
    except Exception as e:
        return {"error": str(e)}
