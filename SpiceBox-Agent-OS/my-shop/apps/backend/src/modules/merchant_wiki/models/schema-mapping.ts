import { model } from "@medusajs/framework/utils"

const MerchantSchemaMapping = model.define("merchant_schema_mapping", {
  id: model.id().primaryKey(),
  merchant_id: model.text().default("default_merchant"),
  domain: model.enum(["catalog", "reviews", "promotions", "inventory", "orders"]),
  source_table: model.text(),
  field_mappings: model.json(),
  is_active: model.boolean().default(true),
  sample_preview: model.json().nullable(),
})

export default MerchantSchemaMapping
