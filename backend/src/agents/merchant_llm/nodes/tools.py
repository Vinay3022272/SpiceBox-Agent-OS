"""
tools.py — LangChain commerce tools for the Merchant Commerce Agent.
"""

import os
import base64
from pathlib import Path
from typing import Dict, Any, Optional
from dotenv import load_dotenv
import razorpay
import qrcode
from langchain_core.tools import tool

from ..utils.cart import (
    add_item_to_cart,
    get_cart_data,
    remove_item_from_cart,
    clear_cart_data,
)
from ...knowledge_grap_manager_llm.query_pipeline import (
    query_knowledge_base,
    query_marketing_intelligence,
    query_upsell_alternatives,
)


# Resolve backend root path: .../backend (5 levels up from tools.py)
_BACKEND_DIR = Path(__file__).resolve().parents[4]
_DEFAULT_WIKI_PATH = str(_BACKEND_DIR / "merchant_knowledge_test")
if not Path(_DEFAULT_WIKI_PATH).exists():
    _DEFAULT_WIKI_PATH = str(_BACKEND_DIR / "merchant_knowledge")

# Load environment variables for Razorpay
_env_path = _BACKEND_DIR / ".env"
if _env_path.exists():
    load_dotenv(str(_env_path))


def _get_razorpay_client() -> Optional[razorpay.Client]:
    """Initialize and return a Razorpay client instance from environment variables."""
    key_id = os.getenv("RAZORPAY_KEY_ID")
    key_secret = os.getenv("RAZORPAY_KEY_SECRET")
    if not key_id or not key_secret:
        return None
    return razorpay.Client(auth=(key_id, key_secret))


def _create_payment_link_and_qr(amount_inr: float, description: str = "Store Purchase") -> dict:
    """
    Internal helper: creates a Razorpay payment link for the given INR amount,
    generates a QR code image from the short URL, and returns the result dictionary.
    """
    client = _get_razorpay_client()
    if client is None:
        return {
            "success": False,
            "error": "Razorpay credentials (RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET) not found in environment."
        }

    amount_paise = int(amount_inr * 100)  # Razorpay expects amount in paise

    try:
        payment_link = client.payment_link.create({
            "amount": amount_paise,
            "currency": "INR",
            "accept_partial": False,
            "description": description,
            "customer": {
                "name": "Customer",
                "contact": "+919876543210",
                "email": "customer@example.com"
            },
            "notify": {
                "sms": False,
                "email": False
            }
        })

        short_url = payment_link.get("short_url", "")
        img = qrcode.make(short_url)

        # Save QR image to disk
        qr_path = f"payment_qr_{payment_link.get('id', 'temp')}.png"
        img.save(qr_path)

        return {
            "success": True,
            "payment_link_id": payment_link.get("id"),
            "payment_url": short_url,
            "amount_inr": amount_inr,
            "qr_image_path": qr_path,
            "message": f"Payment link created for ₹{amount_inr:,.0f}. Scan the QR code or visit: {short_url}"
        }
    except Exception as e:
        return {
            "success": False,
            "error": f"Failed to create Razorpay payment link: {str(e)}"
        }


@tool
def add_to_cart(product_id: str, quantity: int = 1, name: str = "", price: float = 0.0) -> Dict[str, Any]:
    """
    Add a product to the customer's shopping cart.

    Args:
        product_id: The ID or name of the product (e.g. 'airpods_4', 'iphone_17', 'AirPods').
        quantity: Quantity of the product to add (default is 1).
        name: Optional display name of the product.
        price: Optional price of the product (if known from product lookup).
    """
    return add_item_to_cart(product_id=product_id, quantity=quantity, name=name, price=price)


@tool
def get_cart() -> Dict[str, Any]:
    """
    Get the customer's current shopping cart items, total quantity, and total price.
    """
    return get_cart_data()


@tool
def remove_from_cart(product_id: str) -> Dict[str, Any]:
    """
    Remove a product from the customer's cart by product_id or product name.

    Args:
        product_id: The ID or name of the product to remove.
    """
    return remove_item_from_cart(product_id=product_id)


@tool
def clear_cart() -> Dict[str, Any]:
    """
    Clear all items from the customer's shopping cart.
    """
    return clear_cart_data()


@tool
def get_product_catalog(query: str, merchant_id: str = "merchant_electronics_01") -> str:
    """
    Search or query the store's product catalog (including product names, specs, prices, categories, and reviews).

    Args:
        query: The search query or product request.
        merchant_id: Unique merchant store ID.
    """
    result = query_knowledge_base(
        query=query,
        wiki_base_path=_DEFAULT_WIKI_PATH,
        merchant_id=merchant_id
    )
    return result.get("answer", "No product catalog data found.")


@tool
def get_upsell_products(product_id: str, merchant_id: str = "merchant_electronics_01") -> str:
    """
    Find complementary products, accessories, cross-category items, or promotional deals for a product.
    Use this for cross-category recommendations (e.g. AirPods with iPhone, case with tablet).
    Do NOT use this for same-category upgrades — use `get_better_alternatives` for that.

    Args:
        product_id: Product ID or name to find complementary items for.
        merchant_id: Unique merchant store ID.
    """
    query = f"What complementary accessories, discounts, or upsell recommendations exist for {product_id}?"
    result = query_marketing_intelligence(
        query=query,
        wiki_base_path=_DEFAULT_WIKI_PATH,
        merchant_id=merchant_id
    )
    return result.get("answer", "No upsell recommendations found.")


@tool
def get_better_alternatives(product_name: str, merchant_id: str = "merchant_electronics_01") -> str:
    """
    Find the requested product AND all better-priced alternatives in the same category.
    This is the Indian shopkeeper-style recommendation: show what they asked for,
    then show them the premium options in the same category.

    MUST be called EVERY TIME a customer asks about, inquires, or wants to buy a specific product.

    Args:
        product_name: The product name the customer asked about (e.g. 'Samsung Galaxy S24', 'iPhone 15').
        merchant_id: Unique merchant store ID.
    """
    result = query_upsell_alternatives(
        product_name=product_name,
        wiki_base_path=_DEFAULT_WIKI_PATH,
        merchant_id=merchant_id
    )
    return result.get("answer", "No product or alternatives found.")


@tool
def generate_payment_qr(amount_inr: float = 0.0, description: str = "Store Purchase") -> dict:
    """
    Generate a Razorpay payment link and QR code for checkout.

    ONLY call this tool when the customer explicitly asks to pay, checkout, or
    proceed to payment. If amount_inr is 0 or not provided, the tool will
    automatically use the current cart total.

    Args:
        amount_inr: The payment amount in INR. If 0, uses the cart total.
        description: A short description for the payment (e.g. "Cart checkout").
    """
    # If no amount specified, calculate from current cart
    if amount_inr <= 0:
        cart_data = get_cart_data()
        amount_inr = float(cart_data.get("total", 0.0))

    if amount_inr <= 0:
        return {
            "success": False,
            "error": "Cart is empty. Please add items before checkout."
        }

    return _create_payment_link_and_qr(amount_inr=amount_inr, description=description)


@tool
def show_receipt_image(file_path: str) -> str:
    """
    Returns an image (such as QR code or receipt) as an embedded base64 markdown string to display directly.

    Args:
        file_path: Path to the image file.
    """
    try:
        with open(file_path, "rb") as img_file:
            b64_string = base64.b64encode(img_file.read()).decode("utf-8")
        return f"![Receipt](data:image/png;base64,{b64_string})"
    except Exception as e:
        return f"Unable to load image from {file_path}: {str(e)}"


all_tools = [
    add_to_cart,
    get_cart,
    remove_from_cart,
    clear_cart,
    get_upsell_products,
    get_better_alternatives,
    get_product_catalog,
    generate_payment_qr,
    show_receipt_image,
]

