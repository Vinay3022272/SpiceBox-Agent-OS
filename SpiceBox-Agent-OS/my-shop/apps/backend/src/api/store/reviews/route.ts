import { MedusaRequest, MedusaResponse } from "@medusajs/framework/http"
import ReviewModuleService from "../../../modules/review/service"
import { REVIEW_MODULE } from "../../../modules/review"

export async function GET(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const { product_id, order_id } = req.query as {
    product_id?: string
    order_id?: string
  }

  try {
    const reviewService: ReviewModuleService = req.scope.resolve(REVIEW_MODULE)

    const filters: any = {}
    if (product_id) {
      filters.product_id = product_id
    }
    if (order_id) {
      filters.order_id = order_id
    }

    const reviews = await reviewService.listProductReviews(filters, {
      order: { created_at: "DESC" },
    })

    let averageRating = 0
    if (reviews.length > 0) {
      const sum = reviews.reduce((acc, r: any) => acc + (r.rating || 0), 0)
      averageRating = Number((sum / reviews.length).toFixed(1))
    }

    res.status(200).json({
      reviews,
      count: reviews.length,
      average_rating: averageRating,
    })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to fetch reviews",
      error: error.message,
    })
  }
}

export async function POST(
  req: MedusaRequest,
  res: MedusaResponse
): Promise<void> {
  const {
    order_id,
    order_line_item_id,
    product_id,
    customer_id,
    customer_name,
    rating = 5,
    title,
    content,
  } = req.body as {
    order_id: string
    order_line_item_id: string
    product_id: string
    customer_id?: string
    customer_name?: string
    rating?: number
    title?: string
    content: string
  }

  if (!order_id || !order_line_item_id || !product_id || !content) {
    res.status(400).json({
      message: "Fields 'order_id', 'order_line_item_id', 'product_id', and 'content' are required.",
    })
    return
  }

  const numRating = Number(rating)
  if (isNaN(numRating) || numRating < 1 || numRating > 5) {
    res.status(400).json({
      message: "Rating must be a number between 1 and 5.",
    })
    return
  }

  try {
    const reviewService: ReviewModuleService = req.scope.resolve(REVIEW_MODULE)

    // Ensure user has not already reviewed this line item in this order
    const existing = await reviewService.listProductReviews({
      order_id,
      order_line_item_id,
    })

    if (existing && existing.length > 0) {
      res.status(409).json({
        message: "You have already reviewed this item for this order.",
      })
      return
    }

    const review = await reviewService.createProductReviews({
      order_id,
      order_line_item_id,
      product_id,
      customer_id: customer_id || null,
      customer_name: customer_name ? customer_name.trim() : "Verified Buyer",
      rating: Math.round(numRating),
      title: title ? title.trim() : null,
      content: content.trim(),
    })

    res.status(201).json({ review })
  } catch (error: any) {
    res.status(500).json({
      message: "Failed to submit review",
      error: error.message,
    })
  }
}
