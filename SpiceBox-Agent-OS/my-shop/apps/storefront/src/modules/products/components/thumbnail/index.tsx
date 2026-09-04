import { clx } from "@modules/common/components/ui"
import Image from "next/image"
import React from "react"
import PlaceholderImage from "@modules/common/icons/placeholder-image"

type ThumbnailProps = {
  thumbnail?: string | null
  images?: { url?: string }[] | null
  size?: "small" | "medium" | "large" | "full" | "square"
  isFeatured?: boolean
  className?: string
  "data-testid"?: string
}

const Thumbnail: React.FC<ThumbnailProps> = ({
  thumbnail,
  images,
  size = "small",
  isFeatured,
  className,
  "data-testid": dataTestid,
}) => {
  const initialImage = thumbnail || images?.[0]?.url

  return (
    <div
      className={clx(
        "relative w-full overflow-hidden bg-neutral-100 rounded-xl transition-all duration-300",
        className,
        {
          "aspect-[4/5]": isFeatured || size === "full" || size === "large",
          "aspect-square": size === "square",
          "w-[180px] aspect-[4/5]": size === "small",
          "w-[290px] aspect-[4/5]": size === "medium",
          "w-[440px] aspect-[4/5]": size === "large",
          "w-full": size === "full",
        }
      )}
      data-testid={dataTestid}
    >
      <ImageOrPlaceholder image={initialImage} size={size} />
    </div>
  )
}

const ImageOrPlaceholder = ({
  image,
  size,
}: Pick<ThumbnailProps, "size"> & { image?: string }) => {
  return image ? (
    <Image
      src={image}
      alt="Product Image"
      className="absolute inset-0 w-full h-full object-cover object-center transition-transform duration-500 ease-out group-hover:scale-105"
      draggable={false}
      quality={85}
      sizes="(max-width: 576px) 280px, (max-width: 768px) 360px, (max-width: 992px) 480px, 800px"
      fill
    />
  ) : (
    <div className="w-full h-full absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-neutral-100 to-neutral-200 text-neutral-400 p-4 text-center">
      <PlaceholderImage size={size === "small" ? 24 : 36} />
      <span className="text-[10px] text-neutral-400 font-medium mt-1.5 uppercase tracking-wider">
        Product Image
      </span>
    </div>
  )
}

export default Thumbnail
