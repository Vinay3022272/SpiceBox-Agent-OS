import { ExecArgs } from "@medusajs/framework/types"

export default async function cleanDb({ container }: ExecArgs) {
  console.log("--------------------------------------------------")
  console.log("STARTING DATABASE CLEANUP (Preserving Users & Auth)")
  console.log("--------------------------------------------------")

  // Resolve raw postgres connection from container
  const pgConnection = container.resolve("__pg_connection__")

  try {
    // Truncate all commerce-specific tables with CASCADE
    await pgConnection.raw(`
      TRUNCATE TABLE
        cart_line_item_adjustment,
        cart_line_item_tax_line,
        cart_line_item,
        cart_shipping_method_adjustment,
        cart_shipping_method_tax_line,
        cart_shipping_method,
        cart_address,
        cart_promotion,
        cart_payment_collection,
        cart,
        order_line_item_adjustment,
        order_line_item_tax_line,
        order_line_item,
        order_item,
        order_shipping_method_adjustment,
        order_shipping_method_tax_line,
        order_shipping_method,
        order_shipping,
        order_address,
        order_promotion,
        order_payment_collection,
        order_change_action,
        order_change,
        order_claim_item_image,
        order_claim_item,
        order_claim,
        order_exchange_item,
        order_exchange,
        order_credit_line,
        order_fulfillment,
        order_transaction,
        order_summary,
        order_cart,
        "order",
        product_review,
        product_variant_inventory_item,
        product_variant_price_set,
        product_variant_product_image,
        product_variant_option,
        product_product_option_value,
        product_product_option,
        product_option_value,
        product_option,
        product_variant,
        product_category_product,
        product_category,
        product_collection,
        product_sales_channel,
        product_shipping_profile,
        product_tags,
        product_tag,
        product_type,
        product,
        price,
        price_rule,
        price_set,
        inventory_level,
        inventory_item,
        reservation_item
      CASCADE;
    `)

    // Clean up soft-deleted regions/countries
    await pgConnection.raw(`
      DELETE FROM region WHERE deleted_at IS NOT NULL;
      DELETE FROM region_country WHERE deleted_at IS NOT NULL;
    `)

    console.log("✔ Successfully truncated all product, order, price, and cart tables.")
    console.log("✔ Admin users, authentication credentials, and migration records preserved.")
    console.log("--------------------------------------------------")
  } catch (error: any) {
    console.error("❌ Failed to clean database:", error.message)
    throw error
  }
}
