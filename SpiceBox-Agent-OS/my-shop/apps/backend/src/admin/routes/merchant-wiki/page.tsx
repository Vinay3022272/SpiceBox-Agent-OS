import { useState, useEffect } from "react"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import { CircleStack, ArrowPath, Sparkles } from "@medusajs/icons"
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

interface WikiStatus {
  status: string
  last_run: string | null
  last_duration_sec: number
  current_stage: string | null
  page_count: number
  error: string | null
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

  // Wiki generation state
  const [wikiStatus, setWikiStatus] = useState<WikiStatus>({
    status: "idle",
    last_run: null,
    last_duration_sec: 0,
    current_stage: null,
    page_count: 0,
    error: null,
  })
  const [isGenerating, setIsGenerating] = useState(false)

  const loadWikiStatus = async () => {
    try {
      const res = await fetch("/admin/merchant-wiki/generate")
      if (res.ok) {
        const data = await res.json()
        setWikiStatus(data)
        if (data.status === "running") {
          setIsGenerating(true)
        }
      }
    } catch {
      // Ignore background poll errors
    }
  }

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

      await loadWikiStatus()
    } catch {
      toast.error("Error communicating with backend API")
    } finally {
      setIsLoadingTables(false)
    }
  }

  useEffect(() => {
    loadInitialData()
  }, [])

  // Poll status while generating
  useEffect(() => {
    let interval: any
    if (isGenerating) {
      interval = setInterval(async () => {
        try {
          const res = await fetch("/admin/merchant-wiki/generate")
          if (res.ok) {
            const data: WikiStatus = await res.json()
            setWikiStatus(data)
            if (data.status === "success") {
              setIsGenerating(false)
              toast.success("Merchant Wiki Generated!", {
                description: `Successfully synthesized ${data.page_count} wiki pages in ${data.last_duration_sec}s.`,
              })
            } else if (data.status === "error") {
              setIsGenerating(false)
              toast.error("Wiki Generation Failed", {
                description: data.error || "An error occurred during LLM synthesis.",
              })
            }
          }
        } catch {
          // Ignore transient poll errors
        }
      }, 2500)
    }
    return () => {
      if (interval) clearInterval(interval)
    }
  }, [isGenerating])

  const handleGenerateWiki = async (section: "knowledge" | "marketing" = "knowledge") => {
    setIsGenerating(true)
    const label = section === "marketing" ? "Marketing & Promotions Intelligence" : "Knowledge Base"
    toast.info(`Generating ${label}...`, {
      description: "Extracting live DB data and synthesizing markdown dossiers in background.",
    })
    try {
      const res = await fetch("/admin/merchant-wiki/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchant_id: "default_merchant",
          section: section,
        }),
      })

      const data = await res.json()
      if (!res.ok && res.status !== 202) {
        setIsGenerating(false)
        toast.error(data.message || "Failed to trigger wiki generation")
      }
    } catch (err: any) {
      setIsGenerating(false)
      toast.error("Network error triggering wiki: " + err.message)
    }
  }

  const handlePreview = async (
    domain: string,
    primaryTable: string,
    primaryIdCol: string,
    fieldConfigs: Record<string, FieldConfig>,
    customSql?: string,
    joins?: any[]
  ) => {
    setPreviewState((prev) => ({
      ...prev,
      domain,
      sourceTable: primaryTable || "custom_query",
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
          custom_sql: customSql,
          joins: joins,
          limit: 3,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setPreviewState({
          domain,
          sourceTable: primaryTable || "custom_query",
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
    fieldConfigs: Record<string, FieldConfig>,
    customSql?: string,
    joins?: any[]
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
          custom_sql: customSql,
          joins: joins,
          is_active: true,
        }),
      })

      const data = await res.json()

      if (res.ok) {
        setMappings((prev) => ({
          ...prev,
          [domain]: data.mapping,
        }))
        toast.success(`Mapping saved for ${domain}!`)
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
            <div className="flex items-center gap-x-2.5">
              <Heading level="h1" className="text-xl font-semibold leading-7">
                LLM Wiki Mapper
              </Heading>
              {wikiStatus.page_count > 0 && (
                <Badge size="small" color="green">
                  {wikiStatus.page_count} Pages Generated
                </Badge>
              )}
            </div>
            <Text size="small" className="text-ui-fg-subtle mt-0.5">
              Map database schema and generate markdown knowledge dossiers for the AI Salesman.
            </Text>
          </div>

          <div className="flex items-center gap-x-3">
            {wikiStatus.last_run && (
              <div className="hidden md:flex flex-col items-end text-xs text-ui-fg-muted">
                <span className="font-medium text-ui-fg-subtle">
                  Last updated: {wikiStatus.last_run}
                </span>
                <span>{wikiStatus.page_count} wiki pages indexed</span>
              </div>
            )}

            <Badge size="small" color={configuredCount === 4 ? "green" : "grey"}>
              {configuredCount}/4 Domains
            </Badge>

            <Button
              size="small"
              variant="primary"
              className="flex items-center gap-x-1.5 font-medium shadow-sm"
              onClick={() => handleGenerateWiki("knowledge")}
              disabled={isGenerating}
            >
              <Sparkles className={`w-3.5 h-3.5 ${isGenerating ? "animate-spin" : ""}`} />
              <span>{isGenerating ? "Generating..." : "Generate Knowledge Base"}</span>
            </Button>

            <Button
              size="small"
              variant="secondary"
              className="flex items-center gap-x-1.5 font-medium border-neutral-300"
              onClick={() => handleGenerateWiki("marketing")}
              disabled={isGenerating}
              title="Enhances marketing dossiers using promotions, campaigns, and high-rating feedback."
            >
              <span>Enhance Marketing</span>
            </Button>

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

        {/* Live Generation Progress Banner */}
        {isGenerating && (
          <div className="bg-ui-bg-subtle-hover border-y border-ui-border-base px-6 py-2.5 flex items-center justify-between text-xs">
            <div className="flex items-center gap-x-2.5 text-ui-fg-base">
              <ArrowPath className="animate-spin text-ui-fg-interactive w-4 h-4" />
              <span className="font-medium">
                {wikiStatus.current_stage || "Extracting database records & synthesizing LLM knowledge graph..."}
              </span>
            </div>
            <Badge size="small" color="orange">
              In Progress
            </Badge>
          </div>
        )}

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
