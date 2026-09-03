import { model } from "@medusajs/framework/utils"

const ProductReview = model.define("product_review", {
  id: model.id().primaryKey(),
  product_id: model.text(),
  order_id: model.text(),
  order_line_item_id: model.text(),
  customer_id: model.text().nullable(),
  customer_name: model.text().nullable(),
  rating: model.number().default(5),
  title: model.text().nullable(),
  content: model.text(),
})

export default ProductReview
