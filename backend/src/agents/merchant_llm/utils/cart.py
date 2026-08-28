"""
cart.py — Dynamic shopping cart operations for the Merchant Commerce Agent.

Provides non-static, dynamic cart storage and management functions.
"""

from typing import Dict, Any, List

# Fallback session cart store for stateless/in-memory execution
_SESSION_CART: Dict[str, Any] = {
    "items": []
}


def get_global_cart() -> Dict[str, Any]:
    """Retrieve the global session cart reference."""
    return _SESSION_CART


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
    Add or update an item in the shopping cart dynamically.
    """
    target = cart if cart is not None else _SESSION_CART
    if "items" not in target:
        target["items"] = []
        
    pid_clean = product_id.lower().strip()
    display_name = name.strip() if name and name.strip() else product_id.replace("_", " ").replace("-", " ").title()
    
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
                "message": f"Updated quantity for {item['name']} in cart.",
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
        "message": f"Successfully added {display_name} to cart.",
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
                "message": f"Removed {removed_name} from cart.",
                "cart": get_cart_data(target)
            }

    return {
        "success": False,
        "error": f"Product '{product_id}' was not found in your cart.",
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
