"""
pdf_reader.py — Extract text content from PDF files using PyMuPDF.
"""

import fitz  # PyMuPDF


def extract_text_from_pdf(pdf_path: str) -> str:
    """
    Extract all text from a PDF file.
    Returns the full text content as a single string.
    """
    doc = fitz.open(pdf_path)
    text_parts = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        if text.strip():
            text_parts.append(f"--- Page {page_num + 1} ---\n{text}")

    doc.close()
    return "\n\n".join(text_parts)


def extract_pages_from_pdf(pdf_path: str) -> list[dict[str, str | int]]:
    """
    Extract text from each page of a PDF.
    Returns list of dicts with page_number and text.
    """
    doc = fitz.open(pdf_path)
    pages = []

    for page_num in range(len(doc)):
        page = doc[page_num]
        text = page.get_text("text")
        pages.append({
            "page_number": page_num + 1,
            "text": text.strip(),
        })

    doc.close()
    return pages
