import { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CircleStack, ArrowPath } from "@medusajs/icons"
import {
  Container,
  Heading,
  Text,
  Tabs,
  Badge,
  Button,
  Toaster,
  toast,
} from "@medusajs/ui"
import { DomainMapper, DomainType, FieldConfig } from "./components/domain-mapper"
import { PreviewCard } from "./components/preview-card"

const DOMAIN_METADATA: Record<
  DomainType,
  { title: string; description: string; tabLabel: string }
> = {
  catalog: {
    tabLabel: "Catalog",
    title: "Catalog / Products Table",
    description:
      "Map your product entities (e.g. titles, prices, descriptions) across one or multiple tables for the AI Salesman.",
  },
  reviews: {
    tabLabel: "Reviews",
    title: "Customer Reviews & Ratings",
    description:
      "Map customer review feedback and star ratings to synthesize macro sentiment without exposing customer PII.",
  },
  promotions: {
    tabLabel: "Promotions",
    title: "Discounts & Campaigns",
    description:
      "Map coupon codes, percentage discounts, and active campaigns to enable sales negotiation and deals.",
  },
  inventory: {
    tabLabel: "Inventory",
    title: "Stock & Availability",
    description:
      "Map stock quantities and warehouse locations to keep product availability accurate.",
  },
}

const MerchantWikiPage = () => {
  const [activeTab, setActiveTab] = useState<DomainType>("catalog")
  const [tables, setTables] = useState<string[]>([])
  const [isLoadingTables, setIsLoadingTables] = useState(true)
  const [mappings, setMappings] = useState<Record<string, any>>({})
  const [previewState, setPreviewState] = useState<{
    domain: string
    sourceTable: string
    rows: Record<string, any>[]
    csv: string
    sql: string
    isLoading: boolean
  }>({
    domain: "catalog",
    sourceTable: "",
    rows: [],
    csv: "",
    sql: "",
    isLoading: false,
  })
  const [isSaving, setIsSaving] = useState(false)

  const loadInitialData = async () => {
    setIsLoadingTables(true)
    try {
      const [tablesRes, mappingsRes] = await Promise.all([
        fetch("/admin/merchant-wiki/schema/tables"),
        fetch("/admin/merchant-wiki/mappings"),
      ])

      const tablesData = await tablesRes.json()
      const mappingsData = await mappingsRes.json()

      if (tablesRes.ok && tablesData.tables) {
        setTables(tablesData.tables)
      } else {
        toast.error("Failed to introspect PostgreSQL tables")
      }

      if (mappingsRes.ok && mappingsData.mappings) {
        const mappingMap: Record<string, any> = {}
        for (const m of mappingsData.mappings) {
          mappingMap[m.domain] = m
        }
        setMappings(mappingMap)
      }
    } catch (error) {
      toast.error("Error communicating with backend API")
    } finally {
      setIsLoadingTables(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  const handlePreview = async (
    domain: string,
    primaryTable: string,
    primaryIdCol: string,
    fieldConfigs: Record<string, FieldConfig>
  ) => {
    setPreviewState((prev) => ({
      ...prev,
      domain,
      sourceTable: primaryTable,
      isLoading: true,
    }))

    try {
      const res = await fetch("/admin/merchant-wiki/mappings/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain,
          source_table: primaryTable,
          primary_id_col: primaryIdCol,
          field_mappings: fieldConfigs,
          limit: 3,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setPreviewState({
          domain,
          sourceTable: primaryTable,
          rows: data.rows || [],
          csv: data.csv || "",
          sql: data.sql || "",
          isLoading: false,
        })
        toast.success(`Generated preview query for ${domain}`)
      } else {
        toast.error(data.message || "Failed to generate query preview")
        setPreviewState((prev) => ({ ...prev, isLoading: false }))
      }
    } catch (err: any) {
      toast.error("Preview query failed: " + err.message)
      setPreviewState((prev) => ({ ...prev, isLoading: false }))
    }
  }

  const handleSave = async (
    domain: string,
    primaryTable: string,
    fieldConfigs: Record<string, FieldConfig>
  ) => {
    setIsSaving(true)
    try {
      const res = await fetch("/admin/merchant-wiki/mappings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: "default_merchant",
          domain,
          source_table: primaryTable,
          field_mappings: fieldConfigs,
          is_active: true,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setMappings((prev) => ({
          ...prev,
          [domain]: data.mapping,
        }))
        toast.success(`Multi-table mapping saved for ${domain}!`)
      } else {
        toast.error(data.message || "Failed to save mapping")
      }
    } catch (err: any) {
      toast.error("Save failed: " + err.message)
    } finally {
      setIsSaving(false)
    }
  }

  const configuredCount = Object.keys(mappings).length

  return (
    <div className="flex flex-col gap-y-4">
      <Toaster />

      {/* Header Container */}
      <Container className="p-0 divide-y divide-ui-border-base">
        <div className="flex items-center justify-between px-6 py-4">
          <div>
            <Heading level="h1" className="text-xl font-semibold leading-7">
              LLM Wiki Mapper
            </Heading>
            <Text size="small" className="text-ui-fg-subtle">
              Map relational database tables and columns for the AI Salesman Knowledge Graph.
            </Text>
          </div>

          <div className="flex items-center gap-x-2">
            <Badge size="small" color={configuredCount === 4 ? "green" : "grey"}>
              {configuredCount}/4 Domains Configured
            </Badge>
            <Button
              size="small"
              variant="secondary"
              onClick={loadInitialData}
              disabled={isLoadingTables}
            >
              <ArrowPath className={isLoadingTables ? "animate-spin" : ""} />
            </Button>
          </div>
        </div>

        {/* Domain Navigation Tabs with clean spacing */}
        <div className="px-6 py-3 bg-ui-bg-subtle/20">
          <Tabs
            value={activeTab}
            onValueChange={(val) => setActiveTab(val as DomainType)}
          >
            <Tabs.List className="border-b-0">
              {(Object.keys(DOMAIN_METADATA) as DomainType[]).map((d) => {
                const meta = DOMAIN_METADATA[d]
                const isConfigured = !!mappings[d]?.source_table
                return (
                  <Tabs.Trigger key={d} value={d} className="flex items-center gap-x-1.5">
                    <span>{meta.tabLabel}</span>
                    {isConfigured && (
                      <span className="w-1.5 h-1.5 rounded-full bg-ui-tag-green-icon inline-block" />
                    )}
                  </Tabs.Trigger>
                )
              })}
            </Tabs.List>
          </Tabs>
        </div>
      </Container>

      {/* Active Domain Form */}
      <div>
        <DomainMapper
          domain={activeTab}
          domainTitle={DOMAIN_METADATA[activeTab].title}
          domainDescription={DOMAIN_METADATA[activeTab].description}
          tables={tables}
          existingMapping={mappings[activeTab]}
          onPreview={handlePreview}
          onSave={handleSave}
          isPreviewLoading={previewState.isLoading && previewState.domain === activeTab}
          isSaving={isSaving}
        />
      </div>

      {/* Live Preview Panel */}
      {previewState.rows.length > 0 && (
        <PreviewCard
          domain={previewState.domain}
          sourceTable={previewState.sourceTable}
          rows={previewState.rows}
          csv={previewState.csv}
          sql={previewState.sql}
          isLoading={previewState.isLoading}
        />
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "LLM Wiki Mapper",
  icon: CircleStack,
})

export default MerchantWikiPage
