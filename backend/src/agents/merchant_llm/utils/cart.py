"""
cart.py — Dynamic shopping cart operations for the Merchant Commerce Agent.

Provides non-static, dynamic cart storage, wiki price lookup, and management functions.
"""

import os
import re
from pathlib import Path
from typing import Dict, Any, List, Optional
from rapidfuzz import fuzz

# Resolve backend root path
_BACKEND_DIR = Path(__file__).resolve().parents[4]

# Fallback session cart store for stateless/in-memory execution
_SESSION_CART: Dict[str, Any] = {
    "items": []
}


def get_global_cart() -> Dict[str, Any]:
    """Retrieve the global session cart reference."""
    return _SESSION_CART


def _lookup_price_from_wiki(product_name: str, wiki_base_path: Optional[str] = None) -> float:
    """
    Auto-fetch a product's price from the wiki markdown files.
    Fuzzy-matches product_name against page slugs and YAML name fields,
    then extracts the **Price** field or YAML price from the best-matching page.
    Returns 0.0 if no match is found.
    """
    try:
        candidate_dirs = []
        if wiki_base_path:
            p = Path(wiki_base_path)
            candidate_dirs.extend([
                p / "wiki" / "knowledge" / "products",
                p / "knowledge" / "products",
                p / "products",
                p,
            ])
        else:
            candidate_dirs.extend([
                _BACKEND_DIR / "merchant_knowledge_test" / "wiki" / "knowledge" / "products",
                _BACKEND_DIR / "merchant_knowledge_test" / "knowledge" / "products",
                _BACKEND_DIR / "merchant_knowledge" / "wiki" / "knowledge" / "products",
                _BACKEND_DIR / "merchant_knowledge" / "knowledge" / "products",
            ])

        search_dirs = [d for d in candidate_dirs if d.exists()]
        if not search_dirs:
            return 0.0

        best_price = 0.0
        best_score = 0.0
        hint = product_name.lower().replace("-", " ").replace("_", " ")

        for directory in search_dirs:
            for md_file in directory.glob("*.md"):
                slug = md_file.stem.replace("-", " ").replace("_", " ").lower()
                try:
                    content = md_file.read_text(encoding="utf-8")
                except Exception:
                    continue

                # Also check YAML name: field
                name_field = slug
                nm = re.search(r"^name\s*:\s*(.+)$", content, re.MULTILINE | re.IGNORECASE)
                if nm:
                    name_field = nm.group(1).strip().lower()

                score = max(
                    fuzz.partial_ratio(hint, slug),
                    fuzz.partial_ratio(hint, name_field),
                )
                if score > best_score and score >= 65:
                    # Extract price from **Price**: 79900 INR or price: 79900
                    m = re.search(r"\*\*Price\*\*\s*[:\-]\s*([\d,]+)", content, re.IGNORECASE)
                    if not m:
                        m = re.search(r"^price\s*:\s*([\d,]+)", content, re.MULTILINE | re.IGNORECASE)
                    if m:
                        best_price = float(m.group(1).replace(",", ""))
                        best_score = score

        return best_price
    except Exception:
        return 0.0


def get_cart_data(cart: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """
    Calculate totals and structure current cart items.
    
    Args:
        cart: Optional target cart dictionary. Defaults to _SESSION_CART.
        
    Returns:
        Dict containing items list, total cost, and total item count.
    """
    target = cart if cart is not None else _SESSION_CART
    items = target.get("items", [])
    
    total = 0.0
    total_count = 0
    
    for item in items:
        price = float(item.get("price", 0.0))
        qty = int(item.get("quantity", 1))
        total += price * qty
        total_count += qty
        
    return {
        "items": items,
        "total": round(total, 2),
        "item_count": total_count
    }


def add_item_to_cart(
    product_id: str,
    quantity: int = 1,
    name: str = "",
    price: float = 0.0,
    cart: Dict[str, Any] | None = None
) -> Dict[str, Any]:
    """
    Add or update an item in the shopping cart dynamically (with auto price lookup).
    """
    target = cart if cart is not None else _SESSION_CART
    if "items" not in target:
        target["items"] = []
        
    pid_clean = product_id.lower().strip()
    display_name = name.strip() if name and name.strip() else product_id.replace("_", " ").replace("-", " ").title()
    
    # Auto-fetch price from wiki if not provided
    if price <= 0:
        price = _lookup_price_from_wiki(display_name)
        if price <= 0:
            price = _lookup_price_from_wiki(product_id)

    # Check if item is already in cart
    for item in target["items"]:
        item_pid = str(item.get("product_id", "")).lower().strip()
        item_name = str(item.get("name", "")).lower().strip()
        
        if item_pid == pid_clean or item_name == display_name.lower():
            item["quantity"] = int(item.get("quantity", 0)) + int(quantity)
            if price > 0:
                item["price"] = float(price)
                
            return {
                "success": True,
                "message": f"Updated quantity for {item['name']} in cart (₹{item['price']:,.0f} each)",
                "cart": get_cart_data(target)
            }

    # Add new item
    new_item = {
        "product_id": product_id,
        "name": display_name,
        "price": float(price),
        "quantity": int(quantity)
    }
    target["items"].append(new_item)

    return {
        "success": True,
        "message": f"{display_name} (₹{price:,.0f}) added to cart",
        "cart": get_cart_data(target)
    }


def remove_item_from_cart(
    product_id: str,
    cart: Dict[str, Any] | None = None
) -> Dict[str, Any]:
    """
    Remove an item from the shopping cart matching product_id or product name.
    """
    target = cart if cart is not None else _SESSION_CART
    items = target.get("items", [])
    target_clean = product_id.lower().strip()

    for item in list(items):
        item_pid = str(item.get("product_id", "")).lower().strip()
        item_name = str(item.get("name", "")).lower().strip()

        if item_pid == target_clean or item_name == target_clean or target_clean in item_name:
            removed_name = item.get("name", product_id)
            items.remove(item)
            return {
                "success": True,
                "message": f"{removed_name} removed from cart",
                "cart": get_cart_data(target)
            }

    return {
        "success": False,
        "error": f"Product '{product_id}' not present in cart",
        "cart": get_cart_data(target)
    }


def clear_cart_data(cart: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Empty all items from the cart."""
    target = cart if cart is not None else _SESSION_CART
    target["items"] = []
    return {
        "success": True,
        "message": "Shopping cart cleared.",
        "cart": get_cart_data(target)
    }

