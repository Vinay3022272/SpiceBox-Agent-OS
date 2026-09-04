UPDATE merchant_schema_mapping 
SET field_mappings = jsonb_set(
  field_mappings, 
  '{custom_sql}', 
  to_jsonb(
    'SELECT DISTINCT ON (p.id)
  p.title AS name,
  p.handle AS slug,
  pr.amount AS price,
  pr.currency_code AS currency,
  cat.name AS category,
  p.description AS description,
  p.subtitle AS brand
FROM product p
LEFT JOIN product_variant pv ON pv.product_id = p.id
LEFT JOIN product_variant_price_set pvps ON pvps.variant_id = pv.id
LEFT JOIN price pr ON pr.price_set_id = pvps.price_set_id AND pr.price_list_id IS NULL
LEFT JOIN product_category_product pcp ON pcp.product_id = p.id
LEFT JOIN product_category cat ON cat.id = pcp.product_category_id
WHERE p.deleted_at IS NULL
ORDER BY p.id'::text
  )
) 
WHERE domain = 'catalog';

UPDATE merchant_schema_mapping 
SET field_mappings = jsonb_set(
  field_mappings, 
  '{custom_sql}', 
  to_jsonb(
    'SELECT 
  p.handle AS product_slug,
  COALESCE(SUM(il.stocked_quantity), 0) AS stock_quantity,
  MAX(il.location_id) AS location
FROM product p
LEFT JOIN product_variant pv ON pv.product_id = p.id
LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
LEFT JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.handle'::text
  )
) 
WHERE domain = 'inventory';
