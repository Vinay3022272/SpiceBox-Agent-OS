import { NextRequest, NextResponse } from "next/server"
import { getOrSetCart, retrieveCart, addToCart, deleteLineItem } from "@lib/data/cart"
import { retrieveCustomer } from "@lib/data/customer"
import { sdk } from "@lib/config"
import { getAuthHeaders, getCacheTag } from "@lib/data/cookies"
import { revalidateTag } from "next/cache"

const WIKI_RUNNER_URLS = [
  process.env.WIKI_RUNNER_URL || "http://wiki_runner:8002",
  "http://spicebox_wiki_runner:8002",
  "http://host.docker.internal:8002",
  "http://172.17.0.1:8002",
  "http://localhost:8002",
]

async function findVariantForProduct(productIdOrHandle: string, name?: string): Promise<string | null> {
  try {
    const cleanHandle = productIdOrHandle.toLowerCase().replace(/\s+/g, "-")

    // Try exact handle first
    let res = await sdk.store.product.list({
      handle: cleanHandle,
      fields: "*variants",
    })

    if (res.products && res.products.length > 0 && res.products[0].variants?.[0]?.id) {
      return res.products[0].variants[0].id
    }

    // Fallback: search query by name or clean handle
    const searchParam = name || cleanHandle.replace(/-/g, " ")
    res = await sdk.store.product.list({
      q: searchParam,
      fields: "*variants",
    })

    if (res.products && res.products.length > 0 && res.products[0].variants?.[0]?.id) {
      return res.products[0].variants[0].id
    }
  } catch (err) {
    console.error("[findVariantForProduct] Error:", err)
  }
  return null
}

async function getFreshCart(cartId: string) {
  try {
    const authHeaders = await getAuthHeaders()
    const res = await sdk.client.fetch<any>(`/store/carts/${cartId}`, {
      method: "GET",
      query: {
        fields:
          "*items, *region, *items.product, *items.variant, *items.thumbnail, *items.metadata, +items.total, *shipping_address, *billing_address, +shipping_methods.name",
      },
      headers: authHeaders,
      cache: "no-store",
    })
    return res?.cart || null
  } catch (e) {
    console.error("[getFreshCart] Error:", e)
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { messages, merchant_id = "default_merchant", user_id = "customer_web", country_code = "in" } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { success: false, error: "Messages array is required" },
        { status: 400 }
      )
    }

    // 1. Fetch the real Medusa cart for this user/session
    let realCart: any = null
    try {
      const baseCart = await getOrSetCart(country_code)
      if (baseCart && baseCart.id) {
        realCart = await getFreshCart(baseCart.id)
      }
    } catch (e) {
      console.error("[api/chat] Error retrieving Medusa cart:", e)
    }

    // 2. Format items from real Medusa cart for the AI agent
    const cartItems = (realCart?.items || []).map((item: any) => ({
      product_id: item.product?.handle || item.variant?.product?.handle || item.id,
      name: item.title || item.product?.title || "Product",
      price: item.unit_price || 0,
      quantity: item.quantity || 1,
      variant_id: item.variant_id,
      line_id: item.id,
    }))

    // 3. Fetch logged-in customer's saved addresses if available
    let savedAddresses: any[] = []
    try {
      const customer = await retrieveCustomer()
      if (customer?.addresses) {
        savedAddresses = customer.addresses.map((addr) => ({
          first_name: addr.first_name,
          last_name: addr.last_name,
          address_1: addr.address_1,
          city: addr.city,
          postal_code: addr.postal_code,
          phone: addr.phone,
          country_code: addr.country_code,
        }))
      }
    } catch {
      // Customer not logged in or addresses unavailable
    }

    // 4. Contact Python AI merchant agent runner
    let lastError: any = null
    let runnerResponseData: any = null

    for (const baseUrl of WIKI_RUNNER_URLS) {
      try {
        const response = await fetch(`${baseUrl}/chat`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            messages,
            merchant_id,
            user_id,
            cart: {
              items: cartItems,
              shipping_address: realCart?.shipping_address || null,
              total: realCart?.total || 0,
              item_count: realCart?.items?.length || 0,
            },
            saved_addresses: savedAddresses,
          }),
        })

        if (response.ok) {
          runnerResponseData = await response.json()
          break
        }
      } catch (err: any) {
        lastError = err
      }
    }

    if (!runnerResponseData) {
      return NextResponse.json(
        {
          success: false,
          error: `Could not connect to AI Merchant Agent: ${lastError?.message || "All endpoints unreachable"}`,
          response: "I'm having a brief connection issue reaching our store catalog. Please give me a second and try asking again!",
        },
        { status: 503 }
      )
    }

    // 5. Process any cart operations executed by the agent
    const actions = runnerResponseData.actions || []
    let cartModified = false

    for (const act of actions) {
      if (act.type === "add_to_cart" && realCart?.id) {
        const variantId = await findVariantForProduct(act.product_id, act.name)
        if (variantId) {
          try {
            const authHeaders = await getAuthHeaders()
            await sdk.store.cart.createLineItem(
              realCart.id,
              {
                variant_id: variantId,
                quantity: Math.max(1, parseInt(act.quantity || 1, 10)),
              },
              {},
              authHeaders
            )
            cartModified = true
          } catch (e) {
            console.error("[api/chat] Failed to add item to real cart:", e)
          }
        }
      } else if (act.type === "remove_from_cart" && realCart?.id) {
        const pid = (act.product_id || "").toLowerCase()
        const line = realCart.items?.find((i: any) =>
          i.id === pid ||
          i.variant_id === pid ||
          i.product?.handle?.toLowerCase() === pid ||
          i.title?.toLowerCase().includes(pid)
        )
        if (line) {
          try {
            const authHeaders = await getAuthHeaders()
            await sdk.store.cart.deleteLineItem(realCart.id, line.id, {}, authHeaders)
            cartModified = true
          } catch (e) {
            console.error("[api/chat] Failed to remove line item:", e)
          }
        }
      } else if (act.type === "clear_cart" && realCart?.id) {
        try {
          const authHeaders = await getAuthHeaders()
          for (const item of (realCart.items || [])) {
            await sdk.store.cart.deleteLineItem(realCart.id, item.id, {}, authHeaders)
          }
          cartModified = true
        } catch (e) {
          console.error("[api/chat] Failed to clear cart:", e)
        }
      } else if (act.type === "set_address" && realCart?.id && act.address) {
        try {
          const authHeaders = await getAuthHeaders()
          await sdk.store.cart.update(
            realCart.id,
            {
              email: act.address.email || realCart.email || "customer@example.com",
              shipping_address: {
                first_name: act.address.first_name,
                last_name: act.address.last_name,
                address_1: act.address.address_1,
                city: act.address.city,
                postal_code: act.address.postal_code,
                country_code: act.address.country_code || country_code,
                phone: act.address.phone,
              },
            },
            {},
            authHeaders
          )
          cartModified = true
        } catch (e) {
          console.error("[api/chat] Failed to update shipping address:", e)
        }
      }
    }

    // 6. If cart was modified, revalidate Next.js cache and get fresh cart
    if (cartModified && realCart?.id) {
      try {
        const cartCacheTag = await getCacheTag("carts")
        revalidateTag(cartCacheTag)
        realCart = await getFreshCart(realCart.id)
      } catch (e) {
        console.error("[api/chat] Failed to retrieve updated cart:", e)
      }
    }

    const res = NextResponse.json({
      success: true,
      response: runnerResponseData.response,
      cart: realCart || runnerResponseData.cart,
      actions,
      cartModified,
    })

    // Ensure cart ID cookie is attached to response
    if (realCart?.id) {
      res.cookies.set("_medusa_cart_id", realCart.id, {
        path: "/",
        sameSite: "lax",
        httpOnly: true,
      })
    }

    return res
  } catch (error: any) {
    console.error("[api/chat] Internal error:", error)
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    )
  }
}
