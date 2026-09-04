import { HttpTypes } from "@medusajs/types"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

interface MinPricedProduct extends HttpTypes.StoreProduct {
  _minPrice?: number
}

function extractMinPrice(product: HttpTypes.StoreProduct): number {
  if (!product?.variants || product.variants.length === 0) {
    return 0
  }
  const prices: number[] = []
  for (const v of product.variants as any[]) {
    if (v?.calculated_price?.calculated_amount != null) {
      prices.push(Number(v.calculated_price.calculated_amount))
    } else if (Array.isArray(v?.prices)) {
      for (const p of v.prices) {
        if (p?.amount != null) prices.push(Number(p.amount))
      }
    }
  }
  return prices.length > 0 ? Math.min(...prices) : 0
}

export function sortProducts(
  products: HttpTypes.StoreProduct[],
  sortBy: SortOptions
): HttpTypes.StoreProduct[] {
  if (!products || !Array.isArray(products)) return []
  const sortedProducts = [...products] as MinPricedProduct[]

  if (["price_asc", "price_desc"].includes(sortBy)) {
    sortedProducts.forEach((product) => {
      product._minPrice = extractMinPrice(product)
    })

    sortedProducts.sort((a, b) => {
      const priceA = a._minPrice ?? 0
      const priceB = b._minPrice ?? 0
      return sortBy === "price_asc" ? priceA - priceB : priceB - priceA
    })
  } else if (sortBy === "created_at") {
    sortedProducts.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0
      return dateB - dateA
    })
  }

  return sortedProducts
}
