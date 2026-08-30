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
import { Check, PlaySolid } from "@medusajs/icons"

export type DomainType = "catalog" | "reviews" | "promotions" | "inventory"

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
    { key: "currency", label: "Currency Code", required: false, description: "Currency (e.g. INR, USD)" },
    { key: "category", label: "Category / Department", required: false, description: "Category taxonomy" },
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

type DomainMapperProps = {
  domain: DomainType
  domainTitle: string
  domainDescription: string
  tables: string[]
  existingMapping?: {
    source_table: string
    field_mappings: Record<string, string | FieldConfig>
    is_active?: boolean
  }
  onPreview: (
    domain: string,
    primaryTable: string,
    primaryIdCol: string,
    mappings: Record<string, FieldConfig>
  ) => void
  onSave: (
    domain: string,
    primaryTable: string,
    mappings: Record<string, FieldConfig>
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
  const [primaryTable, setPrimaryTable] = useState<string>(
    existingMapping?.source_table || ""
  )
  const [primaryIdCol, setPrimaryIdCol] = useState<string>("id")

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
    if (existingMapping?.source_table) {
      setPrimaryTable(existingMapping.source_table)
      fetchColumnsForTable(existingMapping.source_table)

      const normalized: Record<string, FieldConfig> = {}
      if (existingMapping.field_mappings) {
        for (const [k, v] of Object.entries(existingMapping.field_mappings)) {
          if (typeof v === "string") {
            normalized[k] = {
              table: existingMapping.source_table,
              column: v,
            }
          } else if (typeof v === "object" && v !== null) {
            normalized[k] = {
              table: v.table || existingMapping.source_table,
              column: v.column || "",
              join_on: v.join_on || "",
            }
            if (v.table) {
              fetchColumnsForTable(v.table)
            }
          }
        }
      }
      setFieldConfigs(normalized)
    }
  }, [existingMapping])

  // When primary table changes, fetch its columns
  useEffect(() => {
    if (primaryTable) {
      fetchColumnsForTable(primaryTable)
    }
  }, [primaryTable])

  const handlePrimaryTableChange = (newTable: string) => {
    setPrimaryTable(newTable)
    fetchColumnsForTable(newTable)

    // Update table for fields that don't have custom table set
    setFieldConfigs((prev) => {
      const updated: Record<string, FieldConfig> = {}
      for (const field of DOMAIN_FIELDS[domain]) {
        const existing = prev[field.key]
        updated[field.key] = {
          table: existing?.table || newTable,
          column: existing?.column || "",
          join_on: existing?.join_on || "",
        }
      }
      return updated
    })
  }

  const handleFieldTableChange = (fieldKey: string, newTable: string) => {
    fetchColumnsForTable(newTable)
    setFieldConfigs((prev) => ({
      ...prev,
      [fieldKey]: {
        table: newTable,
        column: "", // reset column when table changes
        join_on:
          newTable !== primaryTable
            ? prev[fieldKey]?.join_on || `${primaryTable}_id`
            : undefined,
      },
    }))
  }

  const handleFieldColumnChange = (fieldKey: string, newColumn: string) => {
    setFieldConfigs((prev) => ({
      ...prev,
      [fieldKey]: {
        table: prev[fieldKey]?.table || primaryTable,
        column: newColumn === "__none__" ? "" : newColumn,
        join_on: prev[fieldKey]?.join_on,
      },
    }))
  }

  const handleFieldJoinOnChange = (fieldKey: string, joinOnCol: string) => {
    setFieldConfigs((prev) => ({
      ...prev,
      [fieldKey]: {
        ...prev[fieldKey],
        table: prev[fieldKey]?.table || primaryTable,
        column: prev[fieldKey]?.column || "",
        join_on: joinOnCol === "__none__" ? "" : joinOnCol,
      },
    }))
  }

  const handlePreviewClick = () => {
    if (!primaryTable) {
      toast.error("Please select a primary database table first")
      return
    }
    onPreview(domain, primaryTable, primaryIdCol, fieldConfigs)
  }

  const handleSaveClick = async () => {
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

    await onSave(domain, primaryTable, fieldConfigs)
  }

  const fields = DOMAIN_FIELDS[domain] || []

  return (
    <Container className="p-0 divide-y divide-ui-border-base">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4">
        <div>
          <Heading level="h2" className="text-base font-semibold">
            {domainTitle}
          </Heading>
          <Text size="small" className="text-ui-fg-subtle">
            {domainDescription}
          </Text>
        </div>
        {existingMapping?.source_table && (
          <Badge size="small" color="green" className="flex items-center gap-x-1">
            <Check /> Primary Table: {existingMapping.source_table}
          </Badge>
        )}
      </div>

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
            The main entity table (e.g. <code>product</code>, <code>items</code>, or <code>reviews</code>).
          </Text>
        </div>

        <div className="space-y-1.5">
          <Label size="small" weight="plus">
            Primary ID / Key Column
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
            Used as the join anchor for multi-table relationships (defaults to <code>id</code>).
          </Text>
        </div>
      </div>

      {/* Multi-Table Per-Field Mapping Grid */}
      {primaryTable && (
        <div className="px-6 py-5 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <Text size="small" weight="plus">
                Field Mappings (Multi-Table Support)
              </Text>
              <Text size="xsmall" className="text-ui-fg-muted">
                Each field can pull from the primary table or join any secondary table in your DB.
              </Text>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {fields.map((field) => {
              const currentTable = fieldConfigs[field.key]?.table || primaryTable
              const currentColumn = fieldConfigs[field.key]?.column || ""
              const currentJoinOn = fieldConfigs[field.key]?.join_on || ""
              const isSecondaryTable = currentTable !== primaryTable
              const availableColumns = tableColumnsMap[currentTable] || []
              const isLoadingCol = loadingTables[currentTable]

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

                  {/* Table & Column Selectors */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1">
                      <Label size="xsmall" className="text-ui-fg-muted">
                        Table
                      </Label>
                      <Select
                        size="small"
                        value={currentTable}
                        onValueChange={(val) =>
                          handleFieldTableChange(field.key, val)
                        }
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

                  {/* Foreign Key Join Selector for Secondary Tables */}
                  {isSecondaryTable && (
                    <div className="pt-2 border-t border-ui-border-base/70 space-y-1">
                      <Label size="xsmall" className="text-ui-tag-blue-text font-medium">
                        Join Key: Foreign Key in <code>{currentTable}</code> matching <code>{primaryTable}.{primaryIdCol}</code>
                      </Label>
                      <Select
                        size="small"
                        value={currentJoinOn || "__none__"}
                        onValueChange={(val) =>
                          handleFieldJoinOnChange(field.key, val)
                        }
                        disabled={isLoadingCol}
                      >
                        <Select.Trigger>
                          <Select.Value placeholder="-- Select FK column --" />
                        </Select.Trigger>
                        <Select.Content>
                          <Select.Item value="__none__">
                            -- Auto ({primaryTable}_id) --
                          </Select.Item>
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
                  )}

                  <Text size="xsmall" className="text-ui-fg-muted">
                    {field.description}
                  </Text>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Action Buttons Footer */}
      {primaryTable && (
        <div className="flex items-center justify-end gap-x-2 px-6 py-4 bg-ui-bg-subtle/40">
          <Button
            size="small"
            variant="secondary"
            onClick={handlePreviewClick}
            disabled={isPreviewLoading || !primaryTable}
          >
            <PlaySolid className="mr-1.5" />
            {isPreviewLoading ? "Generating SQL..." : "Test Query & Preview SQL"}
          </Button>
          <Button
            size="small"
            variant="primary"
            onClick={handleSaveClick}
            disabled={isSaving || !primaryTable}
          >
            {isSaving ? "Saving..." : "Save Mapping"}
          </Button>
        </div>
      )}
    </Container>
  )
}
