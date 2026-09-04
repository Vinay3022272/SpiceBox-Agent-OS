import { Suspense } from "react"

import { OptionValueIds } from "@lib/util/product-option-filters"
import SkeletonProductGrid from "@modules/skeletons/templates/skeleton-product-grid"
import RefinementList from "@modules/store/components/refinement-list"
import { SortOptions } from "@modules/store/components/refinement-list/sort-products"

import PaginatedProducts from "./paginated-products"

const StoreTemplate = ({
  sortBy,
  page,
  countryCode,
  optionValueIds,
}: {
  sortBy?: SortOptions
  page?: string
  countryCode: string
  optionValueIds?: OptionValueIds
}) => {
  const pageNumber = page ? parseInt(page) : 1
  const sort = sortBy || "created_at"

  return (
    <div
      className="flex flex-col small:flex-row small:items-start py-8 gap-8 content-container"
      data-testid="category-container"
    >
      <div className="w-full small:w-64 shrink-0">
        <RefinementList sortBy={sort} />
      </div>
      <div className="w-full flex-1">
        <div className="mb-8 pb-4 border-b border-neutral-100 flex flex-wrap items-baseline justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900" data-testid="store-page-title">
              Featured Catalog
            </h1>
            <p className="text-xs text-neutral-500 mt-1">
              Explore our verified catalog with live agent upselling & instant QR payments.
            </p>
          </div>
        </div>
        <Suspense fallback={<SkeletonProductGrid />}>
          <PaginatedProducts
            sortBy={sort}
            page={pageNumber}
            countryCode={countryCode}
            optionValueIds={optionValueIds}
          />
        </Suspense>
      </div>
    </div>
  )
}

export default StoreTemplate

