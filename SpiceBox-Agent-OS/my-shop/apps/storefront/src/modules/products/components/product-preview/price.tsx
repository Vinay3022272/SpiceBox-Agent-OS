import { Text, clx } from "@modules/common/components/ui"
import { VariantPrice } from "types/global"

export default async function PreviewPrice({ price }: { price: VariantPrice }) {
  if (!price) {
    return null
  }

  return (
    <div className="flex items-baseline gap-1.5 flex-wrap">
      <Text
        className={clx("text-base font-bold tracking-tight text-neutral-900", {
          "text-emerald-600": price.price_type === "sale",
        })}
        data-testid="price"
      >
        {price.calculated_price}
      </Text>
      {price.price_type === "sale" && (
        <Text
          className="text-xs line-through text-neutral-400 font-normal"
          data-testid="original-price"
        >
          {price.original_price}
        </Text>
      )}
    </div>
  )
}

