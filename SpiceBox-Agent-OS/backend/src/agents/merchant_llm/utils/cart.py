"""
cart.py — Dynamic shopping cart operations and payment generation for the Merchant Commerce Agent.
Supports real-shop cart synchronization, address management, and Razorpay/UPI QR generation.
"""

import os
import io
import base64
from typing import Dict, Any, List, Optional
import qrcode
from dotenv import load_dotenv

# Load environment
load_dotenv()

# Global session cart store for fallback / conversation state
_SESSION_CART: Dict[str, Any] = {
    "items": [],
    "shipping_address": None,
    "saved_addresses": [],
    "last_actions": [],
}


def get_global_cart() -> Dict[str, Any]:
    """Retrieve the global session cart reference."""
    return _SESSION_CART


def sync_cart_state(external_items: List[Dict[str, Any]], shipping_address: Optional[Dict[str, Any]] = None, saved_addresses: Optional[List[Dict[str, Any]]] = None):
    """Sync session cart with the real Medusa store cart from storefront."""
    global _SESSION_CART
    _SESSION_CART["items"] = list(external_items)
    if shipping_address:
        _SESSION_CART["shipping_address"] = shipping_address
    if saved_addresses:
        _SESSION_CART["saved_addresses"] = saved_addresses
    _SESSION_CART["last_actions"] = []


def get_cart_data(cart: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Calculate totals and structure current cart items."""
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
        "item_count": total_count,
        "shipping_address": target.get("shipping_address"),
        "last_actions": target.get("last_actions", []),
    }


def add_item_to_cart(
    product_id: str,
    quantity: int = 1,
    name: str = "",
    price: float = 0.0,
    cart: Dict[str, Any] | None = None
) -> Dict[str, Any]:
    """Add or update an item in the shopping cart with exact quantity."""
    target = cart if cart is not None else _SESSION_CART
    if "items" not in target:
        target["items"] = []
    if "last_actions" not in target:
        target["last_actions"] = []

    pid_clean = product_id.lower().strip()
    display_name = name.strip() if name and name.strip() else product_id.replace("_", " ").replace("-", " ").title()
    qty_int = max(1, int(quantity))

    # Check if item is already in cart
    found = False
    for item in target["items"]:
        item_pid = str(item.get("product_id", "")).lower().strip()
        item_name = str(item.get("name", "")).lower().strip()

        if item_pid == pid_clean or item_name == display_name.lower():
            item["quantity"] = int(item.get("quantity", 0)) + qty_int
            if price > 0:
                item["price"] = float(price)
            found = True
            break

    if not found:
        new_item = {
            "product_id": product_id,
            "name": display_name,
            "price": float(price),
            "quantity": qty_int,
        }
        target["items"].append(new_item)

    # Record action for storefront sync
    target["last_actions"].append({
        "type": "add_to_cart",
        "product_id": product_id,
        "name": display_name,
        "price": float(price),
        "quantity": qty_int,
    })

    return {
        "success": True,
        "message": f"Successfully added {qty_int}x {display_name} to your cart.",
        "cart": get_cart_data(target),
    }


def remove_item_from_cart(
    product_id: str,
    cart: Dict[str, Any] | None = None
) -> Dict[str, Any]:
    """Remove an item from the shopping cart."""
    target = cart if cart is not None else _SESSION_CART
    items = target.get("items", [])
    target_clean = product_id.lower().strip()
    removed_items = []

    for item in list(items):
        item_pid = str(item.get("product_id", "")).lower().strip()
        item_name = str(item.get("name", "")).lower().strip()
        if item_pid == target_clean or item_name == target_clean or target_clean in item_name:
            items.remove(item)
            removed_items.append(item.get("name", item_pid))

    if "last_actions" not in target:
        target["last_actions"] = []

    target["last_actions"].append({
        "type": "remove_from_cart",
        "product_id": product_id,
    })

    if removed_items:
        return {
            "success": True,
            "message": f"Removed {', '.join(removed_items)} from your cart.",
            "cart": get_cart_data(target),
        }
    return {
        "success": False,
        "message": f"Item '{product_id}' was not found in your cart.",
        "cart": get_cart_data(target),
    }


def clear_cart_data(cart: Dict[str, Any] | None = None) -> Dict[str, Any]:
    """Clear all items from the shopping cart."""
    target = cart if cart is not None else _SESSION_CART
    target["items"] = []
    if "last_actions" not in target:
        target["last_actions"] = []
    target["last_actions"].append({"type": "clear_cart"})

    return {
        "success": True,
        "message": "Cart has been cleared.",
        "cart": get_cart_data(target),
    }


def set_cart_shipping_address(
    first_name: str,
    last_name: str,
    address_1: str,
    city: str,
    postal_code: str,
    country_code: str = "in",
    phone: str = "",
    email: str = "",
    cart: Dict[str, Any] | None = None
) -> Dict[str, Any]:
    """Save customer shipping address on the cart."""
    target = cart if cart is not None else _SESSION_CART
    address = {
        "first_name": first_name.strip(),
        "last_name": last_name.strip(),
        "address_1": address_1.strip(),
        "city": city.strip(),
        "postal_code": postal_code.strip(),
        "country_code": country_code.lower().strip(),
        "phone": phone.strip(),
        "email": email.strip(),
    }
    target["shipping_address"] = address

    if "last_actions" not in target:
        target["last_actions"] = []

    target["last_actions"].append({
        "type": "set_address",
        "address": address,
    })

    return {
        "success": True,
        "message": f"Shipping address saved for {first_name} {last_name}, {city}, {postal_code}.",
        "address": address,
    }


def create_payment_qr(
    amount_inr: float = 0.0,
    description: str = "Store Purchase",
    cart: Dict[str, Any] | None = None
) -> Dict[str, Any]:
    """
    Generate a Razorpay payment link or UPI QR code for the given INR amount.
    Returns base64 PNG data URL and payment link.
    """
    target = cart if cart is not None else _SESSION_CART

    # If amount is 0, calculate from current cart
    if amount_inr <= 0:
        cart_info = get_cart_data(target)
        amount_inr = cart_info.get("total", 0.0)

    if amount_inr <= 0:
        return {
            "success": False,
            "error": "Your cart is currently empty. Please add items before checkout.",
        }

    payment_url = ""
    rzp_key = os.getenv("RAZORPAY_KEY_ID")
    rzp_secret = os.getenv("RAZORPAY_KEY_SECRET")

    # Try Razorpay payment link if keys are present
    if rzp_key and rzp_secret:
        try:
            import razorpay
            client = razorpay.Client(auth=(rzp_key, rzp_secret))
            link = client.payment_link.create({
                "amount": int(amount_inr * 100),
                "currency": "INR",
                "accept_partial": False,
                "description": description,
                "customer": {
                    "name": "Customer",
                    "contact": "+919876543210",
                    "email": "customer@example.com",
                },
                "notify": {"sms": False, "email": False},
            })
            payment_url = link.get("short_url", "")
        except Exception as e:
            print(f"  [Razorpay fallback] Error creating Razorpay link: {e}")

    # Fallback to standard UPI deep link
    if not payment_url:
        payment_url = f"upi://pay?pa=store@razorpay&pn=MedusaStore&am={amount_inr:.2f}&cu=INR&tn={description.replace(' ', '%20')}"

    # Generate QR Code in memory as base64 PNG
    img = qrcode.make(payment_url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    b64_qr = base64.b64encode(buf.getvalue()).decode("utf-8")
    qr_data_url = f"data:image/png;base64,{b64_qr}"

    if "last_actions" not in target:
        target["last_actions"] = []

    target["last_actions"].append({
        "type": "payment_qr",
        "amount_inr": amount_inr,
        "payment_url": payment_url,
    })

    return {
        "success": True,
        "amount_inr": amount_inr,
        "payment_url": payment_url,
        "qr_data_url": qr_data_url,
        "message": f"Payment QR generated for ₹{amount_inr:,.2f}.",
    }
