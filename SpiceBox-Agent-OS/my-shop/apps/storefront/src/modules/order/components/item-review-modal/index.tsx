"use client"

import React, { useState } from "react"
import { Dialog, Transition } from "@headlessui/react"
import { Fragment } from "react"
import StarRating from "@modules/common/components/star-rating"
import { submitProductReview, ProductReview } from "@lib/data/reviews"
import Spinner from "@modules/common/icons/spinner"
import X from "@modules/common/icons/x"

type ItemReviewModalProps = {
  orderId: string
  lineItemId: string
  productId: string
  productTitle: string
  existingReview?: ProductReview
}

export const ItemReviewModal = ({
  orderId,
  lineItemId,
  productId,
  productTitle,
  existingReview,
}: ItemReviewModalProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [review, setReview] = useState<ProductReview | undefined>(existingReview)

  const [rating, setRating] = useState<number>(5)
  const [title, setTitle] = useState<string>("")
  const [content, setContent] = useState<string>("")
  const [customerName, setCustomerName] = useState<string>("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleOpen = () => {
    setErrorMsg(null)
    setIsOpen(true)
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setIsOpen(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!content.trim()) {
      setErrorMsg("Please write your review feedback.")
      return
    }

    setIsSubmitting(true)
    setErrorMsg(null)

    const result = await submitProductReview({
      order_id: orderId,
      order_line_item_id: lineItemId,
      product_id: productId,
      customer_name: customerName.trim() || undefined,
      rating,
      title: title.trim() || undefined,
      content: content.trim(),
    })

    setIsSubmitting(false)

    if (result.success && result.review) {
      setReview(result.review)
      setIsOpen(false)
    } else {
      setErrorMsg(result.error || "Failed to submit review")
    }
  }

  // If already reviewed, display the rating badge
  if (review) {
    return (
      <div className="flex items-center gap-x-1.5 pt-1 text-xs text-ui-fg-muted">
        <StarRating rating={review.rating} size="small" />
        <span className="font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
          Reviewed ({review.rating}★)
        </span>
      </div>
    )
  }

  return (
    <>
      <div className="pt-2">
        <button
          type="button"
          onClick={handleOpen}
          className="inline-flex items-center gap-x-1 text-xs font-medium text-ui-fg-subtle hover:text-ui-fg-base px-2.5 py-1 rounded border border-ui-border-base bg-ui-bg-subtle hover:bg-ui-bg-base transition-colors"
        >
          <span>★ Write a Review</span>
        </button>
      </div>

      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-[75]" onClose={handleClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-xl bg-white p-6 text-left align-middle shadow-xl transition-all border border-ui-border-base">
                  <div className="flex items-center justify-between pb-3 border-b border-ui-border-base">
                    <Dialog.Title
                      as="h3"
                      className="text-base font-semibold leading-6 text-ui-fg-base"
                    >
                      Review Product
                    </Dialog.Title>
                    <button
                      type="button"
                      onClick={handleClose}
                      className="text-ui-fg-muted hover:text-ui-fg-base p-1 rounded-md"
                    >
                      <X />
                    </button>
                  </div>

                  <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                      <p className="text-sm font-medium text-ui-fg-base">
                        {productTitle}
                      </p>
                      <p className="text-xs text-ui-fg-muted">
                        Verified order #{orderId.slice(-7)}
                      </p>
                    </div>

                    {/* Star Rating Selector */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-ui-fg-subtle">
                        Rating <span className="text-red-500">*</span>
                      </label>
                      <div className="flex items-center gap-x-2">
                        <StarRating
                          rating={rating}
                          interactive={true}
                          onRate={setRating}
                          size="large"
                        />
                        <span className="text-xs text-ui-fg-muted font-medium">
                          {rating} out of 5 stars
                        </span>
                      </div>
                    </div>

                    {/* Reviewer Name */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-ui-fg-subtle">
                        Your Name / Display Nickname
                      </label>
                      <input
                        type="text"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="e.g. Alex M."
                        className="w-full px-3 py-2 text-sm rounded-md border border-ui-border-base bg-ui-bg-subtle focus:bg-white focus:outline-none focus:ring-1 focus:ring-ui-border-interactive"
                      />
                    </div>

                    {/* Review Title */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-ui-fg-subtle">
                        Headline / Title
                      </label>
                      <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Great quality and fast shipping!"
                        className="w-full px-3 py-2 text-sm rounded-md border border-ui-border-base bg-ui-bg-subtle focus:bg-white focus:outline-none focus:ring-1 focus:ring-ui-border-interactive"
                      />
                    </div>

                    {/* Review Content */}
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-ui-fg-subtle">
                        Review Feedback <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        rows={4}
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        placeholder="What did you like or dislike? How was the fit and material?"
                        className="w-full px-3 py-2 text-sm rounded-md border border-ui-border-base bg-ui-bg-subtle focus:bg-white focus:outline-none focus:ring-1 focus:ring-ui-border-interactive resize-y"
                        required
                      />
                    </div>

                    {errorMsg && (
                      <p className="text-xs text-red-600 bg-red-50 p-2 rounded border border-red-200">
                        {errorMsg}
                      </p>
                    )}

                    <div className="flex justify-end gap-x-2 pt-2 border-t border-ui-border-base">
                      <button
                        type="button"
                        onClick={handleClose}
                        disabled={isSubmitting}
                        className="px-3 py-1.5 text-xs font-medium rounded-md border border-ui-border-base text-ui-fg-subtle hover:text-ui-fg-base hover:bg-ui-bg-subtle transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="inline-flex items-center gap-x-1 px-4 py-1.5 text-xs font-medium rounded-md bg-ui-button-inverted text-ui-button-inverted-fg hover:opacity-90 transition-opacity"
                      >
                        {isSubmitting ? (
                          <>
                            <Spinner /> Submitting...
                          </>
                        ) : (
                          "Submit Review"
                        )}
                      </button>
                    </div>
                  </form>
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </>
  )
}

export default ItemReviewModal
