import { Text } from "@modules/common/components/ui"
import { getProductPrice } from "@lib/util/get-product-price"
import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import Thumbnail from "../thumbnail"
import PreviewPrice from "./price"

export default async function ProductPreview({
  product,
  isFeatured,
  region: _region,
}: {
  product: HttpTypes.StoreProduct
  isFeatured?: boolean
  region: HttpTypes.StoreRegion
}) {
  const { cheapestPrice } = getProductPrice({
    product,
  })

  return (
    <LocalizedClientLink href={`/products/${product.handle}`} className="group block h-full">
      <div
        data-testid="product-wrapper"
        className="flex flex-col h-full bg-white border border-neutral-200/90 hover:border-neutral-900 rounded-2xl p-3 transition-all duration-300 hover:shadow-xl group"
      >
        <div className="relative w-full overflow-hidden rounded-xl bg-neutral-50 mb-3">
          <Thumbnail
            thumbnail={product.thumbnail}
            images={product.images}
            size="full"
            isFeatured={isFeatured}
          />
          {product.subtitle && (
            <span className="absolute top-2.5 left-2.5 bg-white/90 backdrop-blur-md text-neutral-800 text-[10px] font-semibold px-2 py-0.5 rounded-full border border-neutral-200/60 shadow-xs z-10">
              {product.subtitle}
            </span>
          )}
        </div>

        <div className="flex flex-col flex-1 justify-between gap-2">
          <div>
            <Text
              className="text-sm font-semibold text-neutral-900 line-clamp-2 leading-snug group-hover:text-black transition-colors"
              data-testid="product-title"
              title={product.title}
            >
              {product.title}
            </Text>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-neutral-100 mt-auto">
            <div>
              {cheapestPrice && <PreviewPrice price={cheapestPrice} />}
            </div>
            <span className="text-xs font-semibold text-neutral-900 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
              View &rarr;
            </span>
          </div>
        </div>
      </div>
    </LocalizedClientLink>
  )
}

