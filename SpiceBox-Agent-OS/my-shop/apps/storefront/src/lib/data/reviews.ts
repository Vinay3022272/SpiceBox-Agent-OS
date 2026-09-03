"use server"

import { sdk } from "@lib/config"

export type ProductReview = {
  id: string
  product_id: string
  order_id: string
  order_line_item_id: string
  customer_id?: string | null
  customer_name?: string | null
  rating: number
  title?: string | null
  content: string
  created_at: string
}

export type ProductReviewsResponse = {
  reviews: ProductReview[]
  count: number
  average_rating: number
}

export const getProductReviews = async (
  productId: string
): Promise<ProductReviewsResponse> => {
  try {
    const res = await sdk.client.fetch<ProductReviewsResponse>(
      `/store/reviews?product_id=${encodeURIComponent(productId)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    )
    return res
  } catch {
    return { reviews: [], count: 0, average_rating: 0 }
  }
}

export const getOrderReviews = async (
  orderId: string
): Promise<ProductReview[]> => {
  try {
    const res = await sdk.client.fetch<{ reviews: ProductReview[] }>(
      `/store/reviews?order_id=${encodeURIComponent(orderId)}`,
      {
        method: "GET",
        cache: "no-store",
      }
    )
    return res.reviews || []
  } catch {
    return []
  }
}

export const submitProductReview = async (data: {
  order_id: string
  order_line_item_id: string
  product_id: string
  customer_name?: string
  rating: number
  title?: string
  content: string
}): Promise<{ success: boolean; review?: ProductReview; error?: string }> => {
  try {
    const res = await sdk.client.fetch<{ review: ProductReview }>(
      `/store/reviews`,
      {
        method: "POST",
        body: data,
      }
    )
    return { success: true, review: res.review }
  } catch (error: any) {
    return { success: false, error: error.message || "Failed to submit review" }
  }
}
