import { useState, useEffect, useMemo } from "react"
import { createPortal } from "react-dom"
import { defineRouteConfig } from "@medusajs/admin-sdk"
import {
  BookOpen,
  DocumentText,
  MagnifyingGlass,
  ArrowPath,
  Folder,
  Tag,
  Clock,
  Star,
} from "@medusajs/icons"
import {
  Container,
  Heading,
  Text,
  Badge,
  Button,
  Input,
  Toaster,
  toast,
} from "@medusajs/ui"
import { KnowledgeGraph } from "./components/knowledge-graph"

interface WikiPageItem {
  path: string
  title: string
  slug: string
  group: "products" | "categories" | "popular" | "promotions" | "specialties" | "system"
  section: "knowledge" | "marketing" | "system"
  section_label: string
  category: string
  brand: string
  price: string
  rating?: number | null
  last_updated: string
  size_bytes: number
}

interface WikiTreeResponse {
  total_pages: number
  group_counts: Record<string, number>
  pages: WikiPageItem[]
}

interface WikiPageDetail {
  path: string
  raw: string
  frontmatter: Record<string, any>
  title: string
  price?: string
  sections: Record<string, string>
  sentiment: {
    rating: number | null
    review_count: number | null
    highlights: string[]
    pros: string[]
    cons: string[]
  }
  related_links: Array<{
    title: string
    target: string
    type: string
  }>
  primary_product_path?: string | null
  marketing_intelligence_path?: string | null
  last_modified: string
}

type FilterTab = "all" | "products" | "categories" | "popular" | "reviews" | "system"

const KnowledgeWikiPage = () => {
  const [tree, setTree] = useState<WikiTreeResponse | null>(null)
  const [isLoadingTree, setIsLoadingTree] = useState(true)
  const [activeTab, setActiveTab] = useState<FilterTab>("all")
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedPath, setSelectedPath] = useState<string>("")
  const [pageDetail, setPageDetail] = useState<WikiPageDetail | null>(null)
  const [isLoadingPage, setIsLoadingPage] = useState(false)
  const [showRawMarkdown, setShowRawMarkdown] = useState(false)
  const [topbarTarget, setTopbarTarget] = useState<Element | null>(null)
  const [viewMode, setViewMode] = useState<"explorer" | "graph">("explorer")

  // Find topbar container in Medusa Shell to portal heading into available top space
  useEffect(() => {
    const findTopbar = () => {
      const el =
        document.querySelector(".grid.w-full.grid-cols-2.border-b > div:first-child") ||
        document.querySelector(".border-b.p-3 > div:first-child") ||
        document.querySelector("header")
      if (el) {
        setTopbarTarget(el)
        return true
      }
      return false
    }

    if (!findTopbar()) {
      const interval = setInterval(() => {
        if (findTopbar()) clearInterval(interval)
      }, 80)
      return () => clearInterval(interval)
    }
  }, [])

  // Fetch wiki tree on mount
  const fetchTree = async (autoSelectFirst = false) => {
    setIsLoadingTree(true)
    try {
      const res = await fetch("/admin/merchant-wiki/content")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data: WikiTreeResponse = await res.json()
      setTree(data)

      if ((!selectedPath || autoSelectFirst) && data.pages.length > 0) {
        // Prefer poze or first reviewed product
        const initial =
          data.pages.find((p) => p.slug === "poze" && p.group === "products") ||
          data.pages.find((p) => p.rating !== null && p.rating !== undefined) ||
          data.pages.find((p) => p.group === "products") ||
          data.pages[0]
        if (initial) {
          setSelectedPath(initial.path)
        }
      }
    } catch (err: any) {
      toast.error("Failed to load Knowledge Wiki", {
        description: err.message || "Is the backend runner running on port 8002?",
      })
    } finally {
      setIsLoadingTree(false)
    }
  }

  useEffect(() => {
    fetchTree(true)
  }, [])

  // Fetch page details when selectedPath changes
  useEffect(() => {
    if (!selectedPath) return

    const fetchPage = async () => {
      setIsLoadingPage(true)
      try {
        const res = await fetch(
          `/admin/merchant-wiki/content?path=${encodeURIComponent(selectedPath)}`
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data: WikiPageDetail = await res.json()
        setPageDetail(data)
      } catch (err: any) {
        toast.error("Failed to load page dossier", {
          description: err.message,
        })
      } finally {
        setIsLoadingPage(false)
      }
    }

    fetchPage()
  }, [selectedPath])

  // Count items with reviews
  const reviewedCount = useMemo(() => {
    if (!tree?.pages) return 0
    return tree.pages.filter((p) => p.rating !== null && p.rating !== undefined).length
  }, [tree])

  // Change tab and auto-select first item of that tab
  const handleTabChange = (newTab: FilterTab) => {
    setActiveTab(newTab)
    if (!tree?.pages) return

    let matchingFirst: WikiPageItem | undefined
    if (newTab === "products") {
      matchingFirst = tree.pages.find((p) => p.group === "products")
    } else if (newTab === "categories") {
      matchingFirst = tree.pages.find((p) => p.group === "categories")
    } else if (newTab === "popular") {
      matchingFirst = tree.pages.find((p) => ["popular", "promotions", "specialties"].includes(p.group))
    } else if (newTab === "reviews") {
      matchingFirst =
        tree.pages.find((p) => p.slug === "poze" && p.group === "products") ||
        tree.pages.find((p) => p.rating !== null && p.rating !== undefined)
    } else if (newTab === "system") {
      matchingFirst = tree.pages.find((p) => p.group === "system")
    } else {
      matchingFirst =
        tree.pages.find((p) => p.slug === "poze" && p.group === "products") ||
        tree.pages[0]
    }

    if (matchingFirst) {
      setSelectedPath(matchingFirst.path)
    }
  }

  // Filtered pages based on active tab and search query
  const filteredPages = useMemo(() => {
    if (!tree?.pages) return []

    return tree.pages.filter((page) => {
      // Tab filter
      if (activeTab === "products") {
        if (page.group !== "products") return false
      } else if (activeTab === "categories") {
        if (page.group !== "categories") return false
      } else if (activeTab === "popular") {
        if (!["popular", "promotions", "specialties"].includes(page.group)) return false
      } else if (activeTab === "reviews") {
        if (page.rating === null || page.rating === undefined) return false
      } else if (activeTab === "system") {
        if (page.group !== "system") return false
      }

      // Search filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim()
        const titleMatch = page.title.toLowerCase().includes(q)
        const slugMatch = page.slug.toLowerCase().includes(q)
        const categoryMatch = page.category?.toLowerCase().includes(q)
        const brandMatch = page.brand?.toLowerCase().includes(q)
        return titleMatch || slugMatch || categoryMatch || brandMatch
      }

      return true
    })
  }, [tree, activeTab, searchQuery])

  // Handle clicking a related link inside a dossier
  const handleRelatedClick = (target: string) => {
    if (!tree?.pages) return
    const cleanFilename = target.split("/").pop() || ""
    const matchingPage = tree.pages.find((p) => p.path.endsWith(cleanFilename))
    if (matchingPage) {
      setSelectedPath(matchingPage.path)
    }
  }

  // Parse chronological log entries if log.md is selected
  const parsedLogEntries = useMemo(() => {
    if (selectedPath !== "log.md" || !pageDetail?.raw) return []

    const entries: Array<{
      date: string
      operation: string
      section: string
      status: string
      added: string
      updated: string
      reviews: string
      pagesCreated: string[]
      pagesUpdated: string[]
    }> = []

    const blocks = pageDetail.raw.split("---")
    for (const block of blocks) {
      const trimmed = block.trim()
      if (!trimmed.includes("## [")) continue

      const titleMatch = trimmed.match(/## \[([^\]]+)\]\s*([^|\n]+)\s*\|\s*(\w+)/)
      if (!titleMatch) continue

      const date = titleMatch[1]
      const operation = titleMatch[2].trim()
      const section = titleMatch[3].trim()

      const statusMatch = trimmed.match(/\*\*Status:\*\*\s*([A-Z]+)/)
      const status = statusMatch ? statusMatch[1] : "SUCCESS"

      const addedMatch = trimmed.match(/\*\*Products added:\*\*\s*(\d+)/)
      const updatedMatch = trimmed.match(/\*\*Products updated:\*\*\s*(\d+)/)
      const reviewsMatch = trimmed.match(/\*\*Reviews processed:\*\*\s*(\d+)/)

      const pagesCreated: string[] = []
      const createdSection = trimmed.match(/\*\*Pages created:\*\*([\s\S]*?)(?=\*\*|\n\n|$)/)
      if (createdSection) {
        for (const line of createdSection[1].split("\n")) {
          const l = line.trim()
          if (l.startsWith("- `") && l.endsWith("`")) {
            pagesCreated.push(l.slice(3, -1))
          }
        }
      }

      const pagesUpdated: string[] = []
      const updatedSection = trimmed.match(/\*\*Pages updated:\*\*([\s\S]*?)(?=\*\*|\n\n|$)/)
      if (updatedSection) {
        for (const line of updatedSection[1].split("\n")) {
          const l = line.trim()
          if (l.startsWith("- `") && l.endsWith("`")) {
            pagesUpdated.push(l.slice(3, -1))
          }
        }
      }

      entries.unshift({
        date,
        operation,
        section,
        status,
        added: addedMatch ? addedMatch[1] : "0",
        updated: updatedMatch ? updatedMatch[1] : "0",
        reviews: reviewsMatch ? reviewsMatch[1] : "0",
        pagesCreated,
        pagesUpdated,
      })
    }

    return entries
  }, [selectedPath, pageDetail])

  // Get clean overview text without H1 header
  const overviewText = useMemo(() => {
    if (!pageDetail) return ""
    const rawOverview = pageDetail.sections["Overview"] || pageDetail.sections["Why It's Popular"] || ""
    return rawOverview.replace(/^#\s+[^\n]+\n*/, "").trim()
  }, [pageDetail])

  return (
    <div className="flex flex-col gap-y-3 w-full font-sans text-neutral-900">
      <Toaster />

      {/* Shift Heading into Top Space (Medusa Shell Topbar) */}
      {topbarTarget &&
        createPortal(
          <div className="flex items-center gap-2.5 ml-2">
            <span className="text-neutral-300 text-xs">/</span>
            <span className="text-xs font-semibold text-neutral-900 tracking-tight">
              Knowledge Wiki
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              {tree?.total_pages || 0} dossiers
            </span>
            {reviewedCount > 0 && (
              <span className="text-[10px] font-mono px-1.5 py-0.2 rounded-full bg-neutral-900 text-white">
                {reviewedCount} with reviews
              </span>
            )}
            <button
              onClick={() => fetchTree(false)}
              disabled={isLoadingTree}
              className="text-neutral-400 hover:text-neutral-900 p-1 ml-0.5 transition-colors flex items-center"
              title="Sync Knowledge Wiki"
            >
              <ArrowPath className={`w-3.5 h-3.5 ${isLoadingTree ? "animate-spin" : ""}`} />
            </button>

            {/* View Switcher: Explorer vs Neo4j Graph */}
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-md text-[11px] font-medium ml-2 border border-neutral-200">
              <button
                onClick={() => setViewMode("explorer")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  viewMode === "explorer"
                    ? "bg-white text-neutral-900 shadow-xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Dossier Explorer
              </button>
              <button
                onClick={() => setViewMode("graph")}
                className={`px-2 py-0.5 rounded transition-colors ${
                  viewMode === "graph"
                    ? "bg-neutral-900 text-white shadow-xs font-semibold"
                    : "text-neutral-500 hover:text-neutral-800"
                }`}
              >
                Neo4j Graph
              </button>
            </div>
          </div>,
          topbarTarget
        )}

      {/* Fallback header ONLY if topbar is not yet mounted */}
      {!topbarTarget && (
        <div className="flex items-center justify-between pb-2 border-b border-neutral-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-neutral-900">Knowledge Wiki</span>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded-full bg-neutral-100 text-neutral-600 border border-neutral-200">
              {tree?.total_pages || 0}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex items-center bg-neutral-100 p-0.5 rounded-md text-[11px] font-medium border border-neutral-200">
              <button
                onClick={() => setViewMode("explorer")}
                className={`px-2 py-0.5 rounded ${
                  viewMode === "explorer" ? "bg-white text-neutral-900 font-semibold shadow-xs" : "text-neutral-500"
                }`}
              >
                Dossier Explorer
              </button>
              <button
                onClick={() => setViewMode("graph")}
                className={`px-2 py-0.5 rounded ${
                  viewMode === "graph" ? "bg-neutral-900 text-white font-semibold shadow-xs" : "text-neutral-500"
                }`}
              >
                Neo4j Graph
              </button>
            </div>
            <Button
              variant="secondary"
              size="small"
              onClick={() => fetchTree(false)}
              disabled={isLoadingTree}
            >
              <ArrowPath className={`w-3.5 h-3.5 mr-1.5 ${isLoadingTree ? "animate-spin" : ""}`} />
              Sync
            </Button>
          </div>
        </div>
      )}

      {/* View Mode Switching */}
      {viewMode === "graph" ? (
        <KnowledgeGraph
          onSelectDossier={(targetPath) => {
            setSelectedPath(targetPath)
            setViewMode("explorer")
          }}
        />
      ) : (
        /* Main Layout: 2-Column Full Width Split */
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-4 w-full items-start">
        {/* Left Column: Dossier Explorer */}
        <div className="xl:col-span-4 2xl:col-span-3 bg-white border border-neutral-200 rounded-lg p-3 flex flex-col h-[calc(100vh-85px)]">
          {/* Search Box */}
          <div className="relative mb-2.5">
            <MagnifyingGlass className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-neutral-400" />
            <Input
              type="text"
              placeholder="Filter by title, slug, or category..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 text-xs bg-neutral-50/50 border-neutral-200 focus:bg-white"
            />
          </div>

          {/* Minimalist Tabs */}
          <div className="flex flex-wrap gap-1 mb-2.5 pb-2 border-b border-neutral-100">
            {(
              [
                { key: "all", label: "All" },
                { key: "products", label: "Catalog" },
                { key: "reviews", label: "Reviews" },
                { key: "popular", label: "Marketing" },
                { key: "categories", label: "Categories" },
                { key: "system", label: "Audit" },
              ] as const
            ).map((tab) => (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                  activeTab === tab.key
                    ? "bg-neutral-900 text-white"
                    : "text-neutral-600 hover:text-neutral-900 hover:bg-neutral-100"
                }`}
              >
                {tab.label}
                {tab.key === "reviews" && reviewedCount > 0 && (
                  <span className="ml-1 text-[10px] opacity-80">({reviewedCount})</span>
                )}
              </button>
            ))}
          </div>

          {/* Dossiers Scroll List */}
          <div className="flex-1 overflow-y-auto space-y-1 pr-1">
            {isLoadingTree ? (
              <div className="py-16 text-center text-xs text-neutral-400">
                <ArrowPath className="w-4 h-4 mx-auto mb-2 animate-spin text-neutral-400" />
                Loading dossiers...
              </div>
            ) : filteredPages.length === 0 ? (
              <div className="py-16 text-center text-xs text-neutral-400">
                No matching dossiers found.
              </div>
            ) : (
              filteredPages.map((page) => {
                const isSelected = selectedPath === page.path
                return (
                  <div
                    key={page.path}
                    onClick={() => setSelectedPath(page.path)}
                    className={`p-2.5 rounded-md cursor-pointer transition-colors border ${
                      isSelected
                        ? "bg-neutral-900 text-white border-neutral-900"
                        : "bg-white text-neutral-800 border-neutral-100 hover:border-neutral-300 hover:bg-neutral-50/60"
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p
                        className={`text-xs font-semibold truncate ${
                          isSelected ? "text-white" : "text-neutral-900"
                        }`}
                        title={page.title}
                      >
                        {page.title}
                      </p>

                      <div className="shrink-0 flex items-center gap-1.5">
                        {page.rating !== null && page.rating !== undefined && (
                          <span
                            className={`text-[10px] font-mono px-1 py-0.2 rounded font-medium flex items-center gap-0.5 ${
                              isSelected
                                ? "bg-neutral-800 text-neutral-200"
                                : "bg-neutral-100 text-neutral-800"
                            }`}
                            title={`Customer Rating: ${page.rating} / 5`}
                          >
                            ★ {page.rating}
                          </span>
                        )}
                        {page.price && (
                          <span
                            className={`text-[10px] font-mono font-medium ${
                              isSelected ? "text-neutral-300" : "text-neutral-600"
                            }`}
                          >
                            ₹{page.price}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 mt-1 text-[10px]">
                      <span
                        className={`uppercase tracking-wider font-mono text-[9px] px-1 py-0.2 rounded ${
                          isSelected
                            ? "bg-neutral-800 text-neutral-300"
                            : "bg-neutral-100 text-neutral-500"
                        }`}
                      >
                        {page.section_label || page.group}
                      </span>
                      {page.category && (
                        <span
                          className={`truncate max-w-[140px] ${
                            isSelected ? "text-neutral-300" : "text-neutral-400"
                          }`}
                          title={page.category}
                        >
                          {page.category}
                        </span>
                      )}
                      <span
                        className={`truncate font-mono ml-auto text-[9px] ${
                          isSelected ? "text-neutral-400" : "text-neutral-400"
                        }`}
                        title={page.slug}
                      >
                        {page.slug}
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>

          <div className="pt-2 mt-2 border-t border-neutral-100 text-[10px] text-neutral-400 flex items-center justify-between">
            <span>{filteredPages.length} displayed</span>
            <span className="font-mono truncate">merchant_knowledge</span>
          </div>
        </div>

        {/* Right Column: Clean Dossier View */}
        <div className="xl:col-span-8 2xl:col-span-9 bg-white border border-neutral-200 rounded-lg p-6 min-h-[calc(100vh-85px)] flex flex-col justify-between overflow-y-auto">
          {isLoadingPage ? (
            <div className="py-32 text-center text-xs text-neutral-400">
              <ArrowPath className="w-5 h-5 mx-auto mb-2 animate-spin text-neutral-400" />
              Loading dossier content...
            </div>
          ) : !pageDetail ? (
            <div className="py-32 text-center text-xs text-neutral-400">
              Select a dossier from the list to inspect.
            </div>
          ) : selectedPath === "log.md" ? (
            /* Activity & Audit Log View */
            <div className="space-y-4">
              <div className="border-b border-neutral-200 pb-4">
                <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400">
                  System Audit
                </span>
                <h2 className="text-xl font-bold tracking-tight text-neutral-900 mt-1">
                  Ingestion & Activity Log
                </h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Chronological record of autonomous agent synchronizations.
                </p>
              </div>

              <div className="divide-y divide-neutral-100">
                {parsedLogEntries.map((entry, idx) => (
                  <div key={idx} className="py-3.5 first:pt-0">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-semibold text-neutral-900 font-mono">
                          {entry.date}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded uppercase">
                          {entry.section}
                        </span>
                      </div>
                      <span className="text-[10px] font-mono px-2 py-0.5 bg-neutral-900 text-white rounded">
                        {entry.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-neutral-600 mt-2">
                      <span>
                        Added: <strong className="text-neutral-900">{entry.added}</strong>
                      </span>
                      <span>
                        Updated: <strong className="text-neutral-900">{entry.updated}</strong>
                      </span>
                      <span>
                        Reviews: <strong className="text-neutral-900">{entry.reviews}</strong>
                      </span>
                    </div>

                    {entry.pagesUpdated.length > 0 && (
                      <div className="mt-1.5 text-xs text-neutral-500">
                        <span className="text-neutral-400">Updated: </span>
                        <span className="font-mono text-[11px] text-neutral-700">
                          {entry.pagesUpdated.join(", ")}
                        </span>
                      </div>
                    )}
                    {entry.pagesCreated.length > 0 && (
                      <div className="mt-1 text-xs text-neutral-500">
                        <span className="text-neutral-400">Created: </span>
                        <span className="font-mono text-[11px] text-neutral-700">
                          {entry.pagesCreated.join(", ")}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ) : (
            /* Clean Minimalist Dossier View */
            <div className="space-y-6">
              {/* Context Switcher Banner (if counterpart dossier exists) */}
              {(pageDetail.primary_product_path || pageDetail.marketing_intelligence_path) && (
                <div className="p-2.5 bg-neutral-50 border border-neutral-200 rounded-md flex items-center justify-between text-xs">
                  <span className="text-neutral-600">
                    {pageDetail.primary_product_path ? (
                      <>
                        Viewing <strong>Marketing Intelligence</strong>. Linked product dossier with full catalog data is available.
                      </>
                    ) : (
                      <>
                        Viewing <strong>Catalog Product Dossier</strong>. Linked marketing intelligence dossier is available.
                      </>
                    )}
                  </span>
                  <button
                    onClick={() => {
                      const target = pageDetail.primary_product_path || pageDetail.marketing_intelligence_path
                      if (target) setSelectedPath(target)
                    }}
                    className="px-2.5 py-1 bg-neutral-900 hover:bg-neutral-800 text-white rounded text-xs font-medium transition-colors shrink-0"
                  >
                    {pageDetail.primary_product_path ? "View Catalog Dossier" : "View Marketing Dossier"}
                  </button>
                </div>
              )}

              {/* Title & Metadata Header */}
              <div className="border-b border-neutral-200 pb-4">
                <div className="flex items-center gap-2 mb-1 text-[11px] font-mono text-neutral-500">
                  <span className="uppercase tracking-wider px-1.5 py-0.5 bg-neutral-100 rounded text-neutral-700">
                    {pageDetail.frontmatter.type || "Dossier"}
                  </span>
                  {pageDetail.frontmatter.category && (
                    <span>/ {pageDetail.frontmatter.category}</span>
                  )}
                  <span className="ml-auto text-neutral-400 truncate max-w-[240px]" title={pageDetail.path}>
                    {pageDetail.path}
                  </span>
                </div>

                <h2
                  className="text-xl font-bold tracking-tight text-neutral-900 mt-1"
                  title={pageDetail.title}
                >
                  {pageDetail.title}
                </h2>

                <div className="flex flex-wrap items-center gap-4 mt-2 text-xs text-neutral-500">
                  {pageDetail.frontmatter.brand && (
                    <span>
                      Brand: <strong className="text-neutral-800">{pageDetail.frontmatter.brand}</strong>
                    </span>
                  )}
                  <span>
                    Synced: <strong className="text-neutral-800">{pageDetail.last_modified}</strong>
                  </span>
                  {pageDetail.frontmatter.sources && (
                    <span>
                      Source: <code className="font-mono text-[11px] bg-neutral-100 px-1 py-0.5 rounded">{pageDetail.frontmatter.sources}</code>
                    </span>
                  )}
                </div>
              </div>

              {/* Key Figures Strip - Flat, Unboxed Layout */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3 border-b border-neutral-100">
                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                    Price
                  </span>
                  <div className="text-lg font-bold text-neutral-900 mt-0.5">
                    {pageDetail.price || pageDetail.frontmatter.price ? (
                      <>₹{pageDetail.price || pageDetail.frontmatter.price} <span className="text-xs font-normal text-neutral-500">INR</span></>
                    ) : (
                      "Standard"
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                    Rating
                  </span>
                  <div className="text-lg font-bold text-neutral-900 mt-0.5 flex items-center gap-1">
                    {pageDetail.sentiment.rating ? (
                      <>
                        <span>★ {pageDetail.sentiment.rating.toFixed(1)}</span>
                        <span className="text-xs font-normal text-neutral-500">/ 5.0</span>
                      </>
                    ) : (
                      <span className="text-xs text-neutral-400 font-normal">No rating yet</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                    Reviews
                  </span>
                  <div className="text-lg font-bold text-neutral-900 mt-0.5">
                    {pageDetail.sentiment.review_count || (pageDetail.sentiment.rating ? 1 : 0)}{" "}
                    <span className="text-xs font-normal text-neutral-500">verified</span>
                  </div>
                </div>

                <div>
                  <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-400 block">
                    Category
                  </span>
                  <div className="text-sm font-semibold text-neutral-800 mt-0.5 truncate" title={pageDetail.frontmatter.category || "General"}>
                    {pageDetail.frontmatter.category || "General"}
                  </div>
                </div>
              </div>

              {/* Customer Reviews & Feedback Section - Highlighted if present */}
              {(pageDetail.sentiment.rating || pageDetail.sentiment.highlights.length > 0) && (
                <div className="border-b border-neutral-200 pb-5">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400">
                      Customer Reviews & Feedback
                    </h3>
                    <span className="text-xs font-mono text-neutral-900 font-semibold">
                      ★ {pageDetail.sentiment.rating?.toFixed(1) || "5.0"} / 5.0
                    </span>
                  </div>

                  {/* Review Excerpts / Quotes */}
                  {pageDetail.sentiment.highlights.map((quote, qidx) => (
                    <div
                      key={qidx}
                      className="p-3.5 bg-neutral-50 border-l-2 border-neutral-900 mb-3 rounded-r"
                    >
                      <p className="text-xs text-neutral-800 leading-relaxed italic" title={quote}>
                        &ldquo;{quote}&rdquo;
                      </p>
                    </div>
                  ))}

                  {/* Strengths & Complaints Pills */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
                    {pageDetail.sentiment.pros.length > 0 && (
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block mb-1.5">
                          Strengths (Pros)
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {pageDetail.sentiment.pros.map((pro, pidx) => (
                            <span
                              key={pidx}
                              className="text-xs bg-neutral-100 text-neutral-800 px-2 py-0.5 rounded font-medium border border-neutral-200"
                              title={pro}
                            >
                              ✓ {pro}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}

                    {pageDetail.sentiment.cons.length > 0 && (
                      <div>
                        <span className="text-[10px] font-mono uppercase tracking-wider text-neutral-500 block mb-1.5">
                          Points to Note (Cons)
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {pageDetail.sentiment.cons.map((con, cidx) => (
                            <span
                              key={cidx}
                              className="text-xs bg-neutral-100 text-neutral-700 px-2 py-0.5 rounded font-medium border border-neutral-200"
                              title={con}
                            >
                              ! {con}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Overview / Brief */}
              {overviewText && (
                <div className="border-b border-neutral-100 pb-5">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                    Overview & Synthesis
                  </h3>
                  <p className="text-sm leading-relaxed text-neutral-700 whitespace-pre-line">
                    {overviewText}
                  </p>
                </div>
              )}

              {/* Key Selling Points (if present in marketing dossier) */}
              {pageDetail.sections["Key Selling Points"] && (
                <div className="border-b border-neutral-100 pb-5">
                  <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                    Key Selling Points
                  </h3>
                  <div className="text-xs text-neutral-700 leading-relaxed whitespace-pre-line">
                    {pageDetail.sections["Key Selling Points"]}
                  </div>
                </div>
              )}

              {/* Specifications (if present) */}
              {pageDetail.sections["Specifications"] &&
                !pageDetail.sections["Specifications"].includes("No detailed specifications") && (
                  <div className="border-b border-neutral-100 pb-5">
                    <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                      Specifications
                    </h3>
                    <div className="text-xs text-neutral-700 leading-relaxed font-mono bg-neutral-50 p-3 rounded border border-neutral-200 whitespace-pre-line">
                      {pageDetail.sections["Specifications"]}
                    </div>
                  </div>
                )}

              {/* Related Knowledge Links */}
              {pageDetail.related_links.length > 0 && (
                <div>
                  <h3 className="text-xs font-mono uppercase tracking-wider text-neutral-400 mb-2">
                    Connected Knowledge Graph Links
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {pageDetail.related_links.map((link, lidx) => (
                      <div
                        key={lidx}
                        onClick={() => handleRelatedClick(link.target)}
                        className="p-2 rounded border border-neutral-200 hover:border-neutral-900 cursor-pointer transition-colors flex items-center justify-between text-xs"
                        title={link.title}
                      >
                        <span className="truncate font-medium text-neutral-800 mr-2" title={link.title}>
                          {link.title}
                        </span>
                        <span className="shrink-0 text-[10px] font-mono text-neutral-500 bg-neutral-100 px-1.5 py-0.5 rounded">
                          {link.type}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Bottom Raw Markdown Drawer */}
              <div className="pt-2">
                <button
                  onClick={() => setShowRawMarkdown(!showRawMarkdown)}
                  className="text-xs text-neutral-400 hover:text-neutral-700 font-mono underline"
                >
                  {showRawMarkdown ? "Hide source markdown" : "View source markdown (.md)"}
                </button>
                {showRawMarkdown && (
                  <pre className="mt-2 p-3 bg-neutral-900 text-neutral-100 rounded text-xs font-mono overflow-x-auto max-h-56 whitespace-pre-wrap">
                    {pageDetail.raw}
                  </pre>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  )
}

export const config = defineRouteConfig({
  label: "Knowledge Wiki",
  icon: BookOpen,
})

export default KnowledgeWikiPage
