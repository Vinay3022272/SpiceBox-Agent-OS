import { useState, useEffect } from "react"
import {
  Container,
  Heading,
  Text,
  Button,
  Select,
  Badge,
  Label,
  toast,
} from "@medusajs/ui"
import { Check, PlaySolid, Sparkles, Plus, Trash, Code } from "@medusajs/icons"

export type DomainType = "catalog" | "reviews" | "promotions" | "inventory"

export type JoinConfig = {
  id: string
  table: string
  alias?: string
  on: string
  type?: "LEFT" | "INNER" | "RIGHT"
}

type FieldDefinition = {
  key: string
  label: string
  required: boolean
  description: string
}

export type FieldConfig = {
  table: string
  column: string
  join_on?: string
}

const DOMAIN_FIELDS: Record<DomainType, FieldDefinition[]> = {
  catalog: [
    { key: "name", label: "Product Name / Title", required: true, description: "Title or name of the item" },
    { key: "slug", label: "Product Slug / ID", required: false, description: "Unique identifier or handle" },
    { key: "price", label: "Price", required: true, description: "Unit selling price" },
    { key: "currency", label: "Currency Code", required: false, description: "Currency (e.g. EUR, USD, INR)" },
    { key: "category", label: "Category / Department", required: false, description: "Category taxonomy name" },
    { key: "description", label: "Description", required: false, description: "Detailed product summary" },
    { key: "brand", label: "Brand / Manufacturer", required: false, description: "Brand name" },
  ],
  reviews: [
    { key: "product_slug", label: "Product Link ID / SKU", required: true, description: "Foreign key linking review to product" },
    { key: "rating", label: "Rating Score (1-5)", required: true, description: "Numeric rating value" },
    { key: "body", label: "Review Feedback", required: true, description: "Customer review comments" },
    { key: "title", label: "Review Title", required: false, description: "Headline / title" },
    { key: "reviewer", label: "Reviewer Name", required: false, description: "Customer name" },
    { key: "date", label: "Review Date", required: false, description: "Submission timestamp" },
  ],
  promotions: [
    { key: "code", label: "Coupon / Promo Code", required: true, description: "Discount code (e.g. SAVE20)" },
    { key: "discount", label: "Discount Value", required: true, description: "Percentage or amount off" },
    { key: "description", label: "Promo Description", required: false, description: "Discount conditions" },
    { key: "expiry", label: "Valid Until", required: false, description: "Expiration timestamp" },
  ],
  inventory: [
    { key: "product_slug", label: "Product Link ID / SKU", required: true, description: "Product identifier" },
    { key: "stock_quantity", label: "Stock Quantity", required: true, description: "Available units" },
    { key: "location", label: "Warehouse / Location", required: false, description: "Storage location" },
  ],
}

// Built-in presets for Medusa 2.0 (and adaptable for any DB)
const MEDUSA_PRESETS: Record<
  DomainType,
  {
    primaryTable: string
    primaryIdCol: string
    joins: JoinConfig[]
    fields: Record<string, FieldConfig>
    sql: string
  }
> = {
  catalog: {
    primaryTable: "product",
    primaryIdCol: "id",
    joins: [
      { id: "j1", table: "product_variant", alias: "pv", on: "pv.product_id = product.id", type: "LEFT" },
      { id: "j2", table: "product_variant_price_set", alias: "pvps", on: "pvps.variant_id = pv.id", type: "LEFT" },
      { id: "j3", table: "price", alias: "pr", on: "pr.price_set_id = pvps.price_set_id AND pr.price_list_id IS NULL", type: "LEFT" },
      { id: "j4", table: "product_category_product", alias: "pcp", on: "pcp.product_id = product.id", type: "LEFT" },
      { id: "j5", table: "product_category", alias: "cat", on: "cat.id = pcp.product_category_id", type: "LEFT" },
    ],
    fields: {
      name: { table: "product", column: "title" },
      slug: { table: "product", column: "handle" },
      price: { table: "pr", column: "amount" },
      currency: { table: "pr", column: "currency_code" },
      category: { table: "cat", column: "name" },
      description: { table: "product", column: "description" },
      brand: { table: "product", column: "subtitle" },
    },
    sql: `SELECT DISTINCT ON (p.id)
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
ORDER BY p.id`,
  },
  inventory: {
    primaryTable: "product",
    primaryIdCol: "id",
    joins: [
      { id: "j1", table: "product_variant", alias: "pv", on: "pv.product_id = product.id", type: "LEFT" },
      { id: "j2", table: "product_variant_inventory_item", alias: "pvii", on: "pvii.variant_id = pv.id", type: "LEFT" },
      { id: "j3", table: "inventory_level", alias: "il", on: "il.inventory_item_id = pvii.inventory_item_id", type: "LEFT" },
    ],
    fields: {
      product_slug: { table: "product", column: "handle" },
      stock_quantity: { table: "il", column: "stocked_quantity" },
      location: { table: "il", column: "location_id" },
    },
    sql: `SELECT 
  p.handle AS product_slug,
  COALESCE(SUM(il.stocked_quantity), 0) AS stock_quantity,
  MAX(il.location_id) AS location
FROM product p
LEFT JOIN product_variant pv ON pv.product_id = p.id
LEFT JOIN product_variant_inventory_item pvii ON pvii.variant_id = pv.id
LEFT JOIN inventory_level il ON il.inventory_item_id = pvii.inventory_item_id
WHERE p.deleted_at IS NULL
GROUP BY p.id, p.handle`,
  },
  promotions: {
    primaryTable: "promotion",
    primaryIdCol: "id",
    joins: [
      { id: "j1", table: "promotion_application_method", alias: "pam", on: "pam.promotion_id = promotion.id", type: "LEFT" },
    ],
    fields: {
      code: { table: "promotion", column: "code" },
      discount: { table: "pam", column: "value" },
      description: { table: "pam", column: "type" },
      expiry: { table: "promotion", column: "status" },
    },
    sql: `SELECT 
  p.code AS code,
  pam.value AS discount,
  pam.type AS description,
  p.status AS expiry
FROM promotion p
LEFT JOIN promotion_application_method pam ON pam.promotion_id = p.id
WHERE p.deleted_at IS NULL`,
  },
  reviews: {
    primaryTable: "order_line_item",
    primaryIdCol: "id",
    joins: [],
    fields: {
      product_slug: { table: "order_line_item", column: "product_handle" },
      rating: { table: "order_line_item", column: "unit_price" },
      body: { table: "order_line_item", column: "title" },
      title: { table: "order_line_item", column: "title" },
      reviewer: { table: "order_line_item", column: "product_title" },
      date: { table: "order_line_item", column: "created_at" },
    },
    sql: `SELECT 
  oli.product_handle AS product_slug,
  5 AS rating,
  oli.title AS title,
  'Verified purchase' AS body,
  'Verified Customer' AS reviewer,
  oli.created_at AS date
FROM order_line_item oli
WHERE oli.deleted_at IS NULL`,
  },
}

type DomainMapperProps = {
  domain: DomainType
  domainTitle: string
  domainDescription: string
  tables: string[]
  existingMapping?: {
    source_table: string
    field_mappings: any
    is_active?: boolean
  }
  onPreview: (
    domain: string,
    primaryTable: string,
    primaryIdCol: string,
    mappings: Record<string, FieldConfig>,
    customSql?: string,
    joins?: any[]
  ) => void
  onSave: (
    domain: string,
    primaryTable: string,
    mappings: Record<string, FieldConfig>,
    customSql?: string,
    joins?: any[]
  ) => Promise<void>
  isPreviewLoading: boolean
  isSaving: boolean
}

export const DomainMapper = ({
  domain,
  domainTitle,
  domainDescription,
  tables,
  existingMapping,
  onPreview,
  onSave,
  isPreviewLoading,
  isSaving,
}: DomainMapperProps) => {
  // Mode: "visual" (multi-hop joins + dropdowns) vs "sql" (direct SQL / AI query)
  const [mode, setMode] = useState<"visual" | "sql">("visual")
  const [customSql, setCustomSql] = useState<string>("")

  const [primaryTable, setPrimaryTable] = useState<string>(
    existingMapping?.source_table || "product"
  )
  const [primaryIdCol, setPrimaryIdCol] = useState<string>("id")

  // Multi-hop joins list
  const [joins, setJoins] = useState<JoinConfig[]>([])

  // Cache columns per table name
  const [tableColumnsMap, setTableColumnsMap] = useState<
    Record<string, { column_name: string; data_type: string }[]>
  >({})
  const [loadingTables, setLoadingTables] = useState<Record<string, boolean>>({})

  // Normalized field mappings state
  const [fieldConfigs, setFieldConfigs] = useState<Record<string, FieldConfig>>({})

  const fetchColumnsForTable = async (tableName: string) => {
    if (!tableName || tableColumnsMap[tableName]) return

    setLoadingTables((prev) => ({ ...prev, [tableName]: true }))
    try {
      const res = await fetch(
        `/admin/merchant-wiki/schema/columns?table=${encodeURIComponent(tableName)}`
      )
      const data = await res.json()
      if (res.ok && data.columns) {
        setTableColumnsMap((prev) => ({ ...prev, [tableName]: data.columns }))
      }
    } catch {
      toast.error(`Failed to load columns for table ${tableName}`)
    } finally {
      setLoadingTables((prev) => ({ ...prev, [tableName]: false }))
    }
  }

  // Initialize from existing mapping
  useEffect(() => {
    if (existingMapping) {
      const fm = existingMapping.field_mappings || {}

      if (fm.custom_sql) {
        setCustomSql(fm.custom_sql)
        setMode("sql")
      }

      if (Array.isArray(fm.joins)) {
        setJoins(
          fm.joins.map((j: any, i: number) => ({
            id: `join-${i}`,
            table: j.table,
            alias: j.alias,
            on: j.on,
            type: j.type || "LEFT",
          }))
        )
        fm.joins.forEach((j: any) => {
          if (j.table) fetchColumnsForTable(j.table)
        })
      }

      const src = existingMapping.source_table || "product"
      setPrimaryTable(src)
      fetchColumnsForTable(src)

      const rawFields = fm.fields || fm
      const normalized: Record<string, FieldConfig> = {}
      for (const [k, v] of Object.entries(rawFields)) {
        if (k === "custom_sql" || k === "joins" || k === "fields") continue
        if (typeof v === "string") {
          normalized[k] = { table: src, column: v }
        } else if (typeof v === "object" && v !== null) {
          const item = v as any
          normalized[k] = {
            table: item.table || src,
            column: item.column || "",
            join_on: item.join_on || "",
          }
          if (item.table) fetchColumnsForTable(item.table)
        }
      }
      setFieldConfigs(normalized)
    }
  }, [existingMapping, domain])

  // Fetch columns when primary table changes
  useEffect(() => {
    if (primaryTable) {
      fetchColumnsForTable(primaryTable)
    }
  }, [primaryTable])

  const handlePrimaryTableChange = (newTable: string) => {
    setPrimaryTable(newTable)
    fetchColumnsForTable(newTable)
  }

  // Load verified preset for the current domain
  const handleApplyPreset = () => {
    const preset = MEDUSA_PRESETS[domain]
    if (!preset) return

    setPrimaryTable(preset.primaryTable)
    setPrimaryIdCol(preset.primaryIdCol)
    setJoins(preset.joins)
    setFieldConfigs(preset.fields)
    setCustomSql(preset.sql)

    fetchColumnsForTable(preset.primaryTable)
    preset.joins.forEach((j) => fetchColumnsForTable(j.table))

    toast.success(`Loaded Medusa 2.0 schema preset for ${domain}!`)
  }

  // Join table management
  const handleAddJoin = () => {
    const newJoin: JoinConfig = {
      id: `join-${Date.now()}`,
      table: tables[0] || "",
      alias: "",
      on: "",
      type: "LEFT",
    }
    setJoins((prev) => [...prev, newJoin])
  }

  const handleUpdateJoin = (id: string, updates: Partial<JoinConfig>) => {
    setJoins((prev) =>
      prev.map((j) => {
        if (j.id === id) {
          const updated = { ...j, ...updates }
          if (updates.table) {
            fetchColumnsForTable(updates.table)
          }
          return updated
        }
        return j
      })
    )
  }

  const handleRemoveJoin = (id: string) => {
    setJoins((prev) => prev.filter((j) => j.id !== id))
  }

  // Available source options for field mapping (Primary + Joined tables/aliases)
  const availableSources: { value: string; label: string; tableName: string }[] = [
    { value: primaryTable, label: `${primaryTable} (Primary)`, tableName: primaryTable },
  ]
  joins.forEach((j) => {
    if (j.table) {
      const key = j.alias || j.table
      availableSources.push({
        value: key,
        label: j.alias ? `${j.alias} (${j.table})` : j.table,
        tableName: j.table,
      })
    }
  })

  const handleFieldTableChange = (fieldKey: string, newTarget: string) => {
    const src = availableSources.find((s) => s.value === newTarget)
    if (src) {
      fetchColumnsForTable(src.tableName)
    }

    setFieldConfigs((prev) => ({
      ...prev,
      [fieldKey]: {
        table: newTarget,
        column: "",
      },
    }))
  }

  const handleFieldColumnChange = (fieldKey: string, newColumn: string) => {
    setFieldConfigs((prev) => ({
      ...prev,
      [fieldKey]: {
        table: prev[fieldKey]?.table || primaryTable,
        column: newColumn === "__none__" ? "" : newColumn,
      },
    }))
  }

  const handlePreviewClick = () => {
    if (mode === "sql") {
      if (!customSql.trim()) {
        toast.error("Please enter a SQL query to preview")
        return
      }
      onPreview(domain, primaryTable, primaryIdCol, {}, customSql, [])
    } else {
      if (!primaryTable) {
        toast.error("Please select a primary database table first")
        return
      }
      const cleanJoins = joins.map(({ table, alias, on, type }) => ({
        table,
        alias: alias || undefined,
        on,
        type: type || "LEFT",
      }))
      onPreview(domain, primaryTable, primaryIdCol, fieldConfigs, undefined, cleanJoins)
    }
  }

  const handleSaveClick = async () => {
    if (mode === "sql") {
      if (!customSql.trim()) {
        toast.error("Please enter a SQL query before saving")
        return
      }
      await onSave(domain, primaryTable || "custom_query", {}, customSql, [])
    } else {
      if (!primaryTable) {
        toast.error("Please select a primary database table first")
        return
      }

      const requiredFields = DOMAIN_FIELDS[domain].filter((f) => f.required)
      const missing = requiredFields.filter(
        (f) => !fieldConfigs[f.key]?.column || fieldConfigs[f.key]?.column === ""
      )

      if (missing.length > 0) {
        toast.error(
          `Please map required fields: ${missing.map((m) => m.label).join(", ")}`
        )
        return
      }

      const cleanJoins = joins.map(({ table, alias, on, type }) => ({
        table,
        alias: alias || undefined,
        on,
        type: type || "LEFT",
      }))

      await onSave(
        domain,
        primaryTable,
        fieldConfigs,
        undefined,
        cleanJoins
      )
    }
  }

  const fields = DOMAIN_FIELDS[domain] || []

  return (
    <Container className="p-0 divide-y divide-ui-border-base">
      {/* Header & Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-6 py-4">
        <div>
          <Heading level="h2" className="text-base font-semibold">
            {domainTitle}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {domainDescription}
          </Text>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Mode Switcher Buttons */}
          <div className="flex items-center bg-ui-bg-subtle p-1 rounded-md border border-ui-border-base">
            <button
              type="button"
              onClick={() => setMode("visual")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors ${
                mode === "visual"
                  ? "bg-white text-ui-fg-base shadow-sm"
                  : "text-ui-fg-muted hover:text-ui-fg-base"
              }`}
            >
              Visual Mapper
            </button>
            <button
              type="button"
              onClick={() => setMode("sql")}
              className={`px-2.5 py-1 text-xs font-medium rounded transition-colors flex items-center gap-x-1 ${
                mode === "sql"
                  ? "bg-white text-ui-fg-base shadow-sm"
                  : "text-ui-fg-muted hover:text-ui-fg-base"
              }`}
            >
              <Code className="w-3.5 h-3.5" />
              Direct SQL / AI Query
            </button>
          </div>

          {/* Auto-Fill Medusa Preset */}
          <Button
            size="small"
            variant="secondary"
            onClick={handleApplyPreset}
            className="flex items-center gap-x-1.5 text-ui-tag-purple-text"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Auto-Fill Medusa Preset
          </Button>

          {/* Preview & Save */}
          <Button
            size="small"
            variant="secondary"
            onClick={handlePreviewClick}
            disabled={isPreviewLoading}
            className="flex items-center gap-x-1"
          >
            <PlaySolid />
            {isPreviewLoading ? "Querying..." : "Test Preview"}
          </Button>

          <Button
            size="small"
            variant="primary"
            onClick={handleSaveClick}
            disabled={isSaving}
            className="flex items-center gap-x-1"
          >
            <Check />
            {isSaving ? "Saving..." : "Save Mapping"}
          </Button>
        </div>
      </div>

      {/* MODE 1: DIRECT SQL / AI QUERY MODE */}
      {mode === "sql" && (
        <div className="p-6 space-y-4 bg-ui-bg-subtle/20">
          <div className="flex items-center justify-between">
            <div>
              <Text size="small" weight="plus">
                Direct PostgreSQL Query (Adaptive SQL Mode)
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted">
                Write or paste custom SQL with multi-hop joins. Output column aliases should match canonical keys (e.g. <code>name</code>, <code>price</code>, <code>currency</code>, <code>category</code>).
              </Text>
            </div>
            <Badge size="small" color="purple">
              LLM & Multi-Join Ready
            </Badge>
          </div>

          <div className="space-y-2">
            <textarea
              rows={12}
              value={customSql}
              onChange={(e) => setCustomSql(e.target.value)}
              placeholder="SELECT p.title AS name, pr.amount AS price, ... FROM product p LEFT JOIN ..."
              className="w-full font-mono text-xs p-3 rounded-lg border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none focus:ring-1 focus:ring-ui-border-interactive resize-y"
            />
          </div>

          <div className="p-3 bg-ui-bg-subtle rounded-md border border-ui-border-base space-y-1">
            <Text size="xsmall" weight="plus" className="text-ui-fg-subtle">
              Expected Canonical Aliases for {domain}:
            </Text>
            <div className="flex flex-wrap gap-1.5 pt-1">
              {fields.map((f) => (
                <code
                  key={f.key}
                  className="px-2 py-0.5 bg-ui-bg-base border border-ui-border-base rounded text-[11px] text-ui-fg-base"
                >
                  AS {f.key} {f.required ? "*" : ""}
                </code>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* MODE 2: VISUAL FIELD MAPPER (MULTI-HOP RELATIONAL BUILDER) */}
      {mode === "visual" && (
        <>
          {/* Primary Table Configuration */}
          <div className="px-6 py-4 grid grid-cols-1 md:grid-cols-2 gap-4 bg-ui-bg-subtle/30">
            <div className="space-y-1.5">
              <Label size="small" weight="plus">
                Primary / Anchor Table <span className="text-ui-tag-red-text">*</span>
              </Label>
              <Select
                size="small"
                value={primaryTable}
                onValueChange={handlePrimaryTableChange}
              >
                <Select.Trigger>
                  <Select.Value placeholder="-- Select Primary Table --" />
                </Select.Trigger>
                <Select.Content>
                  {tables.map((tbl) => (
                    <Select.Item key={tbl} value={tbl}>
                      {tbl}
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Text size="xsmall" className="text-ui-fg-muted">
                The root table (e.g. <code>product</code>, <code>promotion</code>, or <code>order_line_item</code>).
              </Text>
            </div>

            <div className="space-y-1.5">
              <Label size="small" weight="plus">
                Primary ID Column
              </Label>
              <Select
                size="small"
                value={primaryIdCol}
                onValueChange={(val) => setPrimaryIdCol(val)}
                disabled={!primaryTable}
              >
                <Select.Trigger>
                  <Select.Value placeholder="-- Select Primary Key --" />
                </Select.Trigger>
                <Select.Content>
                  {(tableColumnsMap[primaryTable] || []).map((col) => (
                    <Select.Item key={col.column_name} value={col.column_name}>
                      {col.column_name} ({col.data_type})
                    </Select.Item>
                  ))}
                </Select.Content>
              </Select>
              <Text size="xsmall" className="text-ui-fg-muted">
                Anchor key column (default: <code>id</code>).
              </Text>
            </div>
          </div>

          {/* Section: Relational Multi-Hop Joins Graph */}
          <div className="px-6 py-4 space-y-3 bg-ui-bg-subtle/10 border-t border-ui-border-base">
            <div className="flex items-center justify-between">
              <div>
                <Text size="small" weight="plus">
                  Multi-Hop Table Joins Graph ({joins.length} Joins)
                </Text>
                <Text size="xsmall" className="text-ui-fg-muted">
                  Chain multi-level relationships (e.g. <code>product -&gt; product_variant -&gt; price_set -&gt; price</code>).
                </Text>
              </div>
              <Button
                size="small"
                variant="secondary"
                onClick={handleAddJoin}
                className="flex items-center gap-x-1"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Join Table
              </Button>
            </div>

            {joins.length === 0 ? (
              <div className="p-4 rounded-lg border border-dashed border-ui-border-base text-center">
                <Text size="xsmall" className="text-ui-fg-muted">
                  No multi-hop joins defined. Click "Add Join Table" or use "Auto-Fill Medusa Preset" above.
                </Text>
              </div>
            ) : (
              <div className="space-y-2">
                {joins.map((j, idx) => (
                  <div
                    key={j.id}
                    className="p-3 bg-ui-bg-base border border-ui-border-base rounded-md grid grid-cols-1 md:grid-cols-12 gap-2 items-center"
                  >
                    <div className="md:col-span-2">
                      <Label size="xsmall" className="text-ui-fg-muted block pb-1">
                        Type
                      </Label>
                      <Select
                        size="small"
                        value={j.type || "LEFT"}
                        onValueChange={(val) =>
                          handleUpdateJoin(j.id, { type: val as any })
                        }
                      >
                        <Select.Trigger>
                          <Select.Value />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="LEFT">LEFT JOIN</Select.Item>
                          <Select.Item value="INNER">INNER JOIN</Select.Item>
                          <Select.Item value="RIGHT">RIGHT JOIN</Select.Item>
                        </Select.Content>
                      </Select>
                    </div>

                    <div className="md:col-span-3">
                      <Label size="xsmall" className="text-ui-fg-muted block pb-1">
                        Table
                      </Label>
                      <Select
                        size="small"
                        value={j.table}
                        onValueChange={(val) => handleUpdateJoin(j.id, { table: val })}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="Table" />
                        </Select.Trigger>
                        <Select.Content>
                          {tables.map((tbl) => (
                            <Select.Item key={tbl} value={tbl}>
                              {tbl}
                            </Select.Item>
                          ))}
                        </Select.Content>
                      </Select>
                    </div>

                    <div className="md:col-span-2">
                      <Label size="xsmall" className="text-ui-fg-muted block pb-1">
                        Alias (optional)
                      </Label>
                      <input
                        type="text"
                        value={j.alias || ""}
                        onChange={(e) => handleUpdateJoin(j.id, { alias: e.target.value })}
                        placeholder="e.g. pr, cat"
                        className="w-full text-xs font-mono px-2 py-1 rounded border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-4">
                      <Label size="xsmall" className="text-ui-fg-muted block pb-1">
                        ON Condition
                      </Label>
                      <input
                        type="text"
                        value={j.on}
                        onChange={(e) => handleUpdateJoin(j.id, { on: e.target.value })}
                        placeholder="e.g. pv.product_id = product.id"
                        className="w-full text-xs font-mono px-2 py-1 rounded border border-ui-border-base bg-ui-bg-base text-ui-fg-base focus:outline-none"
                      />
                    </div>

                    <div className="md:col-span-1 flex justify-end pt-4 md:pt-0">
                      <Button
                        size="small"
                        variant="transparent"
                        onClick={() => handleRemoveJoin(j.id)}
                        className="text-ui-tag-red-text hover:bg-ui-tag-red-bg"
                      >
                        <Trash className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Section: Field Mappings Grid */}
          <div className="px-6 py-5 space-y-5">
            <div>
              <Text size="small" weight="plus">
                Canonical Field Mappings
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted">
                Assign each target entity field to a column in your primary or joined tables.
              </Text>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {fields.map((field) => {
                const currentTarget = fieldConfigs[field.key]?.table || primaryTable
                const currentColumn = fieldConfigs[field.key]?.column || ""

                // Lookup table schema columns
                const src = availableSources.find((s) => s.value === currentTarget)
                const realTable = src ? src.tableName : currentTarget
                const availableColumns = tableColumnsMap[realTable] || []
                const isLoadingCol = loadingTables[realTable]

                return (
                  <div
                    key={field.key}
                    className="p-4 rounded-lg border border-ui-border-base bg-ui-bg-subtle space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <Label size="small" weight="plus">
                        {field.label}{" "}
                        {field.required && (
                          <span className="text-ui-tag-red-text">*</span>
                        )}
                      </Label>
                      <Text size="xsmall" className="text-ui-fg-muted font-mono">
                        target: {field.key}
                      </Text>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label size="xsmall" className="text-ui-fg-muted">
                          Source Table / Join
                        </Label>
                        <Select
                          size="small"
                          value={currentTarget}
                          onValueChange={(val) =>
                            handleFieldTableChange(field.key, val)
                          }
                        >
                          <Select.Trigger>
                            <Select.Value placeholder="Table / Alias" />
                          </Select.Trigger>
                          <Select.Content>
                            {availableSources.map((s) => (
                              <Select.Item key={s.value} value={s.value}>
                                {s.label}
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      </div>

                      <div className="space-y-1">
                        <Label size="xsmall" className="text-ui-fg-muted">
                          Column
                        </Label>
                        <Select
                          size="small"
                          value={currentColumn || "__none__"}
                          onValueChange={(val) =>
                            handleFieldColumnChange(field.key, val)
                          }
                          disabled={isLoadingCol}
                        >
                          <Select.Trigger>
                            <Select.Value placeholder="-- Column --" />
                          </Select.Trigger>
                          <Select.Content>
                            <Select.Item value="__none__">-- Skip --</Select.Item>
                            {availableColumns.map((col) => (
                              <Select.Item
                                key={col.column_name}
                                value={col.column_name}
                              >
                                {col.column_name} ({col.data_type})
                              </Select.Item>
                            ))}
                          </Select.Content>
                        </Select>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </>
      )}
    </Container>
  )
}
