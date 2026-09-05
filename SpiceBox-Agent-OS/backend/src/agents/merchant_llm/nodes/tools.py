"""
tools.py — LangChain commerce tools for the Merchant Commerce Agent.
Supports catalog search, upselling, real cart operations, address management, and QR payments.
"""

from pathlib import Path
from typing import Dict, Any
from langchain_core.tools import tool

from ..utils.cart import (
    add_item_to_cart,
    get_cart_data,
    remove_item_from_cart,
    clear_cart_data,
    set_cart_shipping_address,
    create_payment_qr,
)
from ...knowledge_grap_manager_llm.query_pipeline import (
    query_knowledge_base,
    query_marketing_intelligence,
    query_upsell_alternatives,
)

# Resolve backend root path: .../backend
_BACKEND_DIR = Path(__file__).resolve().parents[4]
_DEFAULT_WIKI_PATH = str(_BACKEND_DIR / "merchant_knowledge")


@tool
def add_to_cart(product_id: str, quantity: int = 1, name: str = "", price: float = 0.0) -> Dict[str, Any]:
    """
    Add a product to the customer's real shopping cart with the exact quantity requested.
    Call this IMMEDIATELY whenever the customer confirms or asks to add an item to their cart.

    Args:
        product_id: Product ID, slug, or handle (e.g. 'apex-active-pulse-gps-watch-12', 'mens-organic-cotton-tee-4').
        quantity: Exact number of units to add (e.g. 1, 2, 3). Defaults to 1.
        name: Display title of the product.
        price: Price per unit in INR.
    """
    return add_item_to_cart(product_id=product_id, quantity=quantity, name=name, price=price)


@tool
def get_cart() -> Dict[str, Any]:
    """
    Get the customer's current shopping cart, item list, quantities, prices, shipping address, and total amount.
    Use this to review current cart state or calculate the final bill before payment.
    """
    return get_cart_data()


@tool
def remove_from_cart(product_id: str) -> Dict[str, Any]:
    """
    Remove an item from the customer's shopping cart matching product_id or product name.

    Args:
        product_id: Product ID, handle, or name to remove (e.g. 'mens-organic-cotton-tee-4').
    """
    return remove_item_from_cart(product_id=product_id)


@tool
def clear_cart() -> Dict[str, Any]:
    """
    Clear all items from the customer's shopping cart.
    """
    return clear_cart_data()


@tool
def set_shipping_address(
    first_name: str,
    last_name: str,
    address_1: str,
    city: str,
    postal_code: str,
    country_code: str = "in",
    phone: str = "",
    email: str = ""
) -> str:
    """
    Save the customer's delivery/shipping address to the cart for checkout.
    Use this when the customer provides their shipping address or confirms their delivery details.

    Args:
        first_name: First name of recipient (e.g. 'Amit').
        last_name: Last name of recipient (e.g. 'Sharma').
        address_1: Street address or flat/building (e.g. 'Flat 402, Sunshine Heights, MG Road').
        city: City or town (e.g. 'Bengaluru', 'Mumbai', 'Delhi').
        postal_code: PIN / Postal code (e.g. '560001').
        country_code: Country code (defaults to 'in').
        phone: Contact phone number (e.g. '+919876543210').
        email: Contact email address.
    """
    res = set_cart_shipping_address(
        first_name=first_name,
        last_name=last_name,
        address_1=address_1,
        city=city,
        postal_code=postal_code,
        country_code=country_code,
        phone=phone,
        email=email,
    )
    return res.get("message", "Shipping address saved successfully.")


@tool
def generate_payment_qr(amount_inr: float = 0.0, description: str = "Store Purchase") -> str:
    """
    Generate a Razorpay payment link and QR code for checkout.

    MANDATORY PRE-CONDITION:
    Do NOT call this tool until the customer's delivery/shipping address has been collected and saved using set_shipping_address.
    If the customer wants to pay or checkout, FIRST ask for their delivery address details (Full Name, Address, City, PIN code, Phone number, Email).
    Only call this tool AFTER set_shipping_address has been called!

    Args:
        amount_inr: The payment amount in INR. If 0, uses the cart total.
        description: A short description for the payment (e.g. "Order Checkout").
    """
    cart_data = get_cart_data()
    if not cart_data.get("shipping_address"):
        return (
            "Cannot generate payment QR code yet: Customer's delivery/shipping address is missing. "
            "Please ask the customer to provide their shipping details (Full Name, Street Address, City, PIN Code, Phone number, and Email) "
            "and save it using set_shipping_address FIRST before generating the payment QR."
        )

    res = create_payment_qr(amount_inr=amount_inr, description=description)
    if not res.get("success"):
        return res.get("error", "Failed to generate payment QR. Please ensure items are in the cart.")

    total = res["amount_inr"]
    payment_url = res["payment_url"]
    qr_data_url = res["qr_data_url"]
    plink_id = res.get("payment_link_id", "")
    qr_file = res.get("qr_image_path", "")

    link_info = f" (Link ID: `{plink_id}`)" if plink_id else ""
    return (
        f"### 🧾 Payment & Checkout Summary{link_info}\n\n"
        f"- **Total Amount Due**: ₹{total:,.2f} INR\n"
        f"- **Payment Method**: Razorpay Live Payment Gateway (UPI / Cards / NetBanking)\n\n"
        f"![Payment QR Code]({qr_data_url})\n\n"
        f"📱 **Scan the QR code above with any UPI app (Google Pay, PhonePe, Paytm) or phone camera to complete payment.**\n\n"
        f"🔗 **Direct Payment Link**: [{payment_url}]({payment_url})\n"
        + (f"💾 *Saved QR image file*: `{qr_file}`" if qr_file else "")
    )


@tool
def show_receipt_image(file_path: str) -> str:
    """
    Returns the image file from disk (e.g. payment QR code or invoice) as an embedded base64 markdown string to display directly in chat.

    Args:
        file_path: Path to the image file (e.g. 'payment_qr_plink_TWSoZE6An115Lz.png').
    """
    import base64
    try:
        with open(file_path, "rb") as img_file:
            b64_string = base64.b64encode(img_file.read()).decode("utf-8")
        return f"![Receipt](data:image/png;base64,{b64_string})"
    except Exception as e:
        return f"Could not load image at '{file_path}': {e}"


@tool
def get_product_catalog(query: str, merchant_id: str = "default_merchant") -> str:
    """
    Search or query the store's product catalog (product names, specs, prices, categories, and reviews).
    Use this for GENERAL searches, category browsing, or listing products when a user asks what we have
    (e.g. 'do you have smartphone', 'what watches do you sell', 'show me running shoes', 'what clothes do you have?').

    Args:
        query: The natural language search query (e.g. 'What smartphones do you have?', 'GPS smartwatches').
        merchant_id: Unique merchant store ID.
    """
    result = query_knowledge_base(
        query=query,
        wiki_base_path=_DEFAULT_WIKI_PATH,
        merchant_id=merchant_id
    )
    return result.get("answer", "No product catalog data found.")


@tool
def get_better_alternatives(product_name: str, merchant_id: str = "default_merchant") -> str:
    """
    Find the requested specific product AND all better-priced, higher-tier alternatives in the same category.
    Use this ONLY when the customer has specified or asked about a SPECIFIC product model/name (e.g. 'iPhone 15', 'Apex Pulse Watch', 'Samsung S24').
    Do NOT use this tool for general category browsing questions like 'do you have smartphone'.

    Args:
        product_name: Specific name or title of the product the customer asked about (e.g. 'iPhone 15').
        merchant_id: Unique merchant store ID.
    """
    result = query_upsell_alternatives(
        product_name=product_name,
        wiki_base_path=_DEFAULT_WIKI_PATH,
        merchant_id=merchant_id,
    )
    return result.get("answer", "No alternatives found.")


@tool
def get_upsell_products(product_id: str, merchant_id: str = "default_merchant") -> str:
    """
    Find complementary products, cross-sells, accessory recommendations, or promotional deals
    (e.g., cases, chargers, or bundles) related to a given product_id or category.

    Args:
        product_id: Product ID, handle, or category name to find accessories/bundles for.
        merchant_id: Unique merchant store ID.
    """
    query = f"What complementary accessories, protection items, discounts, or upsell recommendations exist for {product_id}?"
    result = query_marketing_intelligence(
        query=query,
        wiki_base_path=_DEFAULT_WIKI_PATH,
        merchant_id=merchant_id
    )
    return result.get("answer", "No upsell recommendations found.")


all_tools = [
    add_to_cart,
    get_cart,
    remove_from_cart,
    clear_cart,
    set_shipping_address,
    generate_payment_qr,
    show_receipt_image,
    get_product_catalog,
    get_better_alternatives,
    get_upsell_products,
]
