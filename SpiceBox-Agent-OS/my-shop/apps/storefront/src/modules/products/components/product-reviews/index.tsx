"use client"

import React, { useEffect, useState } from "react"
import StarRating from "@modules/common/components/star-rating"
import { ProductReview, getProductReviews } from "@lib/data/reviews"

type ProductReviewsProps = {
  productId: string
}

export const ProductReviews = ({ productId }: ProductReviewsProps) => {
  const [reviews, setReviews] = useState<ProductReview[]>([])
  const [count, setCount] = useState<number>(0)
  const [averageRating, setAverageRating] = useState<number>(0)
  const [isLoading, setIsLoading] = useState<boolean>(true)

  useEffect(() => {
    let isMounted = true
    const fetchReviews = async () => {
      try {
        const data = await getProductReviews(productId)
        if (isMounted) {
          setReviews(data.reviews || [])
          setCount(data.count || 0)
          setAverageRating(data.average_rating || 0)
        }
      } catch {
        // graceful fallback
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }
    fetchReviews()
    return () => {
      isMounted = false
    }
  }, [productId])

  if (isLoading) {
    return (
      <div className="py-6 text-sm text-ui-fg-muted flex items-center justify-center">
        <span>Loading customer reviews...</span>
      </div>
    )
  }

  return (
    <div className="py-6 space-y-6">
      {/* Reviews Summary Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-ui-bg-subtle border border-ui-border-base">
        <div className="flex items-center gap-x-4">
          <div className="text-3xl font-bold text-ui-fg-base">
            {count > 0 ? averageRating.toFixed(1) : "—"}
          </div>
          <div>
            <StarRating
              rating={averageRating}
              size="medium"
              showScore={false}
            />
            <p className="text-xs text-ui-fg-muted mt-0.5">
              {count === 0
                ? "No reviews yet"
                : `Based on ${count} verified ${count === 1 ? "review" : "reviews"}`}
            </p>
          </div>
        </div>

        <div className="text-xs text-ui-fg-subtle flex items-center gap-x-1">
          <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
          <span>Verified Buyer Feedback</span>
        </div>
      </div>

      {/* Review List */}
      {reviews.length === 0 ? (
        <div className="text-center py-8 px-4 rounded-xl border border-dashed border-ui-border-base">
          <p className="text-sm font-medium text-ui-fg-base">
            No reviews yet
          </p>
          <p className="text-xs text-ui-fg-muted mt-1 max-w-sm mx-auto">
            Reviews are submitted by verified customers once an order is placed and delivered.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((rev) => {
            const formattedDate = new Date(rev.created_at).toLocaleDateString(
              undefined,
              { year: "numeric", month: "short", day: "numeric" }
            )

            return (
              <div
                key={rev.id}
                className="p-4 rounded-xl border border-ui-border-base bg-white space-y-2.5 shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-x-2">
                    <span className="text-sm font-semibold text-ui-fg-base">
                      {rev.customer_name || "Verified Customer"}
                    </span>
                    <span className="text-[11px] font-medium text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                      ✓ Verified Buyer
                    </span>
                  </div>
                  <span className="text-xs text-ui-fg-muted font-mono">
                    {formattedDate}
                  </span>
                </div>

                <div className="flex items-center gap-x-2">
                  <StarRating rating={rev.rating} size="small" />
                  {rev.title && (
                    <span className="text-sm font-medium text-ui-fg-base">
                      {rev.title}
                    </span>
                  )}
                </div>

                <p className="text-sm text-ui-fg-subtle leading-relaxed">
                  {rev.content}
                </p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default ProductReviews
