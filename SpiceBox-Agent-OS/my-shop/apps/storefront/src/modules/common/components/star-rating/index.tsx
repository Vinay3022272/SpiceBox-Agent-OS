"use client"

import React, { useState } from "react"

type StarRatingProps = {
  rating: number
  maxStars?: number
  interactive?: boolean
  onRate?: (rating: number) => void
  size?: "small" | "medium" | "large"
  showScore?: boolean
}

export const StarRating = ({
  rating,
  maxStars = 5,
  interactive = false,
  onRate,
  size = "medium",
  showScore = false,
}: StarRatingProps) => {
  const [hoverRating, setHoverRating] = useState<number | null>(null)

  const displayRating = hoverRating !== null ? hoverRating : rating

  const sizeClasses = {
    small: "w-3.5 h-3.5",
    medium: "w-5 h-5",
    large: "w-7 h-7",
  }[size]

  return (
    <div className="flex items-center gap-x-1">
      <div className="flex items-center">
        {Array.from({ length: maxStars }).map((_, index) => {
          const starValue = index + 1
          const isFilled = displayRating >= starValue
          const isHalf = !isFilled && displayRating >= starValue - 0.5

          return (
            <button
              key={index}
              type="button"
              disabled={!interactive}
              onClick={() => interactive && onRate && onRate(starValue)}
              onMouseEnter={() => interactive && setHoverRating(starValue)}
              onMouseLeave={() => interactive && setHoverRating(null)}
              className={`${
                interactive ? "cursor-pointer hover:scale-110 transition-transform" : "cursor-default"
              } p-0.5 focus:outline-none`}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill={isFilled ? "#f59e0b" : isHalf ? "#f59e0b" : "#e5e7eb"}
                stroke={isFilled || isHalf ? "#d97706" : "#d1d5db"}
                strokeWidth="1"
                className={`${sizeClasses} transition-colors`}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M11.48 3.499a.562.562 0 011.04 0l2.125 5.111a.563.563 0 00.475.345l5.518.442c.499.04.701.663.321.988l-4.204 3.602a.563.563 0 00-.182.557l1.285 5.385a.562.562 0 01-.84.61l-4.725-2.885a.563.563 0 00-.586 0L6.982 20.54a.562.562 0 01-.84-.61l1.285-5.386a.562.562 0 00-.182-.557l-4.204-3.602a.563.563 0 01.321-.988l5.518-.442a.563.563 0 00.475-.345L11.48 3.5z"
                />
              </svg>
            </button>
          )
        })}
      </div>
      {showScore && (
        <span className="text-small-regular text-ui-fg-subtle ml-1">
          {rating.toFixed(1)} / {maxStars}
        </span>
      )}
    </div>
  )
}

export default StarRating
