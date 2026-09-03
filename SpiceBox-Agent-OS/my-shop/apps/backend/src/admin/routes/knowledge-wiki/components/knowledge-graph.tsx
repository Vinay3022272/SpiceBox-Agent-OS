import React, { useRef, useEffect, useState, useMemo, useCallback } from "react"
import {
  MagnifyingGlass,
  ArrowPath,
  Folder,
  Tag,
  Star,
  CheckCircleSolid,
} from "@medusajs/icons"
import { Button, Input, Badge } from "@medusajs/ui"

export interface GraphNode {
  id: string
  slug: string
  name: string
  type: "category" | "product"
  category?: string
  category_slug?: string
  price?: string
  rating?: number | null
  brand?: string
  path: string
  radius: number
  color: string
  product_count?: number
  // Physics coordinates
  x: number
  y: number
  vx: number
  vy: number
  fx?: number | null
  fy?: number | null
}

export interface GraphLink {
  id: string
  source: string | GraphNode
  target: string | GraphNode
  type: "BELONGS_TO" | "ALTERNATIVE_TO"
  label: string
}

interface KnowledgeGraphProps {
  onSelectDossier: (path: string) => void
}

export const KnowledgeGraph: React.FC<KnowledgeGraphProps> = ({
  onSelectDossier,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [nodes, setNodes] = useState<GraphNode[]>([])
  const [links, setLinks] = useState<GraphLink[]>([])
  const [categories, setCategories] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Interactive controls
  const [selectedNode, setSelectedNode] = useState<GraphNode | null>(null)
  const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null)
  const [hoverPos, setHoverPos] = useState<{ x: number; y: number } | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState<string>("all")
  const [isPhysicsRunning, setIsPhysicsRunning] = useState(true)

  // Camera transform
  const transformRef = useRef({ x: 0, y: 0, k: 0.85 })
  const isDraggingCanvasRef = useRef(false)
  const dragStartRef = useRef({ x: 0, y: 0 })
  const draggedNodeRef = useRef<GraphNode | null>(null)

  // Fetch graph data from backend
  const fetchGraphData = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch("/admin/merchant-wiki/content?type=graph")
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()

      const rawNodes: any[] = data.nodes || []
      const rawLinks: any[] = data.links || []
      const cats: string[] = data.categories || []

      // Initialize positions in organic circular clusters
      const catAngleStep = (Math.PI * 2) / Math.max(1, cats.length)
      const catPositions: Record<string, { x: number; y: number }> = {}

      cats.forEach((catSlug, i) => {
        const angle = i * catAngleStep
        const dist = 380 + (i % 2) * 60
        catPositions[catSlug] = {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist,
        }
      })

      const initializedNodes: GraphNode[] = rawNodes.map((n) => {
        let initialX = (Math.random() - 0.5) * 400
        let initialY = (Math.random() - 0.5) * 400

        if (n.type === "category") {
          const pos = catPositions[n.slug]
          if (pos) {
            initialX = pos.x
            initialY = pos.y
          }
        } else if (n.category_slug && catPositions[n.category_slug]) {
          const catPos = catPositions[n.category_slug]
          const randAngle = Math.random() * Math.PI * 2
          const randDist = 40 + Math.random() * 110
          initialX = catPos.x + Math.cos(randAngle) * randDist
          initialY = catPos.y + Math.sin(randAngle) * randDist
        }

        return {
          ...n,
          x: initialX,
          y: initialY,
          vx: 0,
          vy: 0,
          radius: n.type === "category" ? 22 : n.rating ? 14 : 10,
        }
      })

      setNodes(initializedNodes)
      setLinks(rawLinks)
      setCategories(cats)
    } catch (err: any) {
      setError(err.message || "Failed to load knowledge graph")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchGraphData()
  }, [])

  // Node Map for fast ID lookups
  const nodeMap = useMemo(() => {
    const map = new Map<string, GraphNode>()
    nodes.forEach((n) => map.set(n.id, n))
    return map
  }, [nodes])

  // Resolved Link objects
  const resolvedLinks = useMemo(() => {
    return links
      .map((l) => {
        const s = typeof l.source === "string" ? nodeMap.get(l.source) : l.source
        const t = typeof l.target === "string" ? nodeMap.get(l.target) : l.target
        if (!s || !t) return null
        return {
          ...l,
          source: s,
          target: t,
        }
      })
      .filter(Boolean) as (GraphLink & { source: GraphNode; target: GraphNode })[]
  }, [links, nodeMap])

  // Neighbors of hovered or selected node for Neo4j focus dimming
  const activeFocusNeighbors = useMemo(() => {
    const active = hoveredNode || selectedNode
    if (!active) return null

    const neighbors = new Set<string>()
    neighbors.add(active.id)

    resolvedLinks.forEach((link) => {
      if (link.source.id === active.id) neighbors.add(link.target.id)
      if (link.target.id === active.id) neighbors.add(link.source.id)
    })

    return neighbors
  }, [hoveredNode, selectedNode, resolvedLinks])

  // Fit graph to center
  const handleFitView = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas || nodes.length === 0) return

    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity
    nodes.forEach((n) => {
      if (n.x < minX) minX = n.x
      if (n.x > maxX) maxX = n.x
      if (n.y < minY) minY = n.y
      if (n.y > maxY) maxY = n.y
    })

    const width = canvas.clientWidth || 800
    const height = canvas.clientHeight || 600
    const graphWidth = maxX - minX + 160
    const graphHeight = maxY - minY + 160

    const scaleX = width / graphWidth
    const scaleY = height / graphHeight
    const k = Math.min(1.4, Math.max(0.35, Math.min(scaleX, scaleY)))

    transformRef.current = {
      x: width / 2 - ((minX + maxX) / 2) * k,
      y: height / 2 - ((minY + maxY) / 2) * k,
      k,
    }
  }, [nodes])

  // Run initial fit once nodes load
  useEffect(() => {
    if (nodes.length > 0) {
      setTimeout(handleFitView, 150)
    }
  }, [nodes.length, handleFitView])

  // Force-Directed Physics Simulation Step
  useEffect(() => {
    let animationFrameId: number

    const stepSimulation = () => {
      if (isPhysicsRunning && nodes.length > 0) {
        const alpha = 0.05
        const repulsionStrength = 1400
        const centerGravity = 0.0008

        // 1. Repulsion between nearby nodes
        for (let i = 0; i < nodes.length; i++) {
          const n1 = nodes[i]
          for (let j = i + 1; j < nodes.length; j++) {
            const n2 = nodes[j]
            const dx = n2.x - n1.x
            const dy = n2.y - n1.y
            const distSq = dx * dx + dy * dy || 1
            if (distSq < 160000) {
              const dist = Math.sqrt(distSq)
              const force = (repulsionStrength / (distSq + 200)) * alpha
              const fx = (dx / dist) * force
              const fy = (dy / dist) * force

              n1.vx -= fx
              n1.vy -= fy
              n2.vx += fx
              n2.vy += fy
            }
          }
        }

        // 2. Link spring tension
        resolvedLinks.forEach((link) => {
          const s = link.source
          const t = link.target
          const dx = t.x - s.x
          const dy = t.y - s.y
          const dist = Math.sqrt(dx * dx + dy * dy) || 1
          const desiredDist = link.type === "BELONGS_TO" ? 75 : 60
          const force = (dist - desiredDist) * 0.04 * alpha
          const fx = (dx / dist) * force
          const fy = (dy / dist) * force

          s.vx += fx
          s.vy += fy
          t.vx -= fx
          t.vy -= fy
        })

        // 3. Central gravity & velocity damping
        nodes.forEach((n) => {
          if (n === draggedNodeRef.current) return // Do not move dragged node

          n.vx -= n.x * centerGravity
          n.vy -= n.y * centerGravity

          n.vx *= 0.88
          n.vy *= 0.88

          n.x += n.vx
          n.y += n.vy
        })
      }

      // Render frame
      renderCanvas()
      animationFrameId = requestAnimationFrame(stepSimulation)
    }

    animationFrameId = requestAnimationFrame(stepSimulation)
    return () => cancelAnimationFrame(animationFrameId)
  }, [isPhysicsRunning, nodes, resolvedLinks])

  // Canvas Renderer
  const renderCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const dpr = window.devicePixelRatio || 1
    const width = canvas.clientWidth
    const height = canvas.clientHeight

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr
      canvas.height = height * dpr
    }

    ctx.save()
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, width, height)

    // Background Neo4j dot matrix grid
    const { x: panX, y: panY, k } = transformRef.current
    ctx.save()
    const dotSpacing = 32 * k
    if (dotSpacing > 12) {
      ctx.fillStyle = "#f4f4f5"
      const startX = (panX % dotSpacing) - dotSpacing
      const startY = (panY % dotSpacing) - dotSpacing
      for (let gx = startX; gx < width + dotSpacing; gx += dotSpacing) {
        for (let gy = startY; gy < height + dotSpacing; gy += dotSpacing) {
          ctx.beginPath()
          ctx.arc(gx, gy, 1, 0, Math.PI * 2)
          ctx.fill()
        }
      }
    }
    ctx.restore()

    // Apply camera pan & zoom
    ctx.translate(panX, panY)
    ctx.scale(k, k)

    const focusSet = activeFocusNeighbors
    const searchLower = searchQuery.toLowerCase().trim()

    // 1. Draw Links
    resolvedLinks.forEach((link) => {
      const s = link.source
      const t = link.target
      const isConnectedToFocus =
        !focusSet || (focusSet.has(s.id) && focusSet.has(t.id))

      ctx.beginPath()
      ctx.moveTo(s.x, s.y)
      ctx.lineTo(t.x, t.y)

      if (isConnectedToFocus && focusSet) {
        // Highlighted active link
        ctx.strokeStyle = link.type === "BELONGS_TO" ? "#18181b" : "#52525b"
        ctx.lineWidth = 1.8 / k
        ctx.setLineDash([])
      } else if (focusSet) {
        // Dimmed link
        ctx.strokeStyle = "#f4f4f5"
        ctx.lineWidth = 0.8 / k
        ctx.setLineDash([])
      } else {
        // Normal state
        ctx.strokeStyle = link.type === "BELONGS_TO" ? "#e4e4e7" : "#d4d4d8"
        ctx.lineWidth = 1.0 / k
        ctx.setLineDash(link.type === "ALTERNATIVE_TO" ? [3, 2] : [])
      }
      ctx.stroke()
      ctx.setLineDash([])

      // Draw subtle relationship type label on hover
      if (isConnectedToFocus && focusSet && k > 0.75) {
        const midX = (s.x + t.x) / 2
        const midY = (s.y + t.y) / 2
        ctx.fillStyle = "#71717a"
        ctx.font = `600 ${8 / k}px monospace`
        ctx.textAlign = "center"
        ctx.fillText(link.label, midX, midY - 3)
      }
    })

    // 2. Draw Nodes
    nodes.forEach((node) => {
      const isCategory = node.type === "category"
      const isFocus = focusSet ? focusSet.has(node.id) : true
      const isSelected = selectedNode?.id === node.id
      const isHovered = hoveredNode?.id === node.id
      const isSearchMatch =
        searchLower &&
        (node.name.toLowerCase().includes(searchLower) ||
          node.slug.toLowerCase().includes(searchLower))

      // Category filter check
      const matchesCatFilter =
        selectedCategory === "all" ||
        (isCategory && node.slug === selectedCategory) ||
        node.category_slug === selectedCategory

      const opacity = matchesCatFilter && isFocus ? 1 : 0.15
      ctx.globalAlpha = opacity

      // Outer Selection / Search Halo
      if (isSelected || isSearchMatch) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius + 6 / k, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(0, 0, 0, 0.08)"
        ctx.fill()
        ctx.lineWidth = 2 / k
        ctx.strokeStyle = "#18181b"
        ctx.stroke()
      } else if (isHovered) {
        ctx.beginPath()
        ctx.arc(node.x, node.y, node.radius + 4 / k, 0, Math.PI * 2)
        ctx.fillStyle = "rgba(0, 0, 0, 0.05)"
        ctx.fill()
      }

      // Node Body
      ctx.beginPath()
      ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2)

      if (isCategory) {
        ctx.fillStyle = "#18181b"
        ctx.fill()
        ctx.strokeStyle = "#ffffff"
        ctx.lineWidth = 2 / k
        ctx.stroke()
      } else {
        // Product node
        ctx.fillStyle = node.rating ? "#18181b" : "#ffffff"
        ctx.fill()
        ctx.strokeStyle = node.rating ? "#000000" : "#71717a"
        ctx.lineWidth = 1.6 / k
        ctx.stroke()
      }

      // Inner icon or star for reviewed products
      if (!isCategory && node.rating) {
        ctx.fillStyle = "#ffffff"
        ctx.font = `bold ${node.radius * 0.9}px sans-serif`
        ctx.textAlign = "center"
        ctx.textBaseline = "middle"
        ctx.fillText("★", node.x, node.y + 0.5)
      }

      // Node Label (when zoomed in or hovered/selected)
      if (k > 0.65 || isCategory || isSelected || isHovered) {
        ctx.globalAlpha = opacity
        ctx.textAlign = "center"
        ctx.textBaseline = "top"

        if (isCategory) {
          ctx.font = `bold ${10 / k}px sans-serif`
          ctx.fillStyle = "#09090b"
          ctx.fillText(node.name, node.x, node.y + node.radius + 4 / k)
          if (node.product_count) {
            ctx.font = `normal ${8 / k}px monospace`
            ctx.fillStyle = "#71717a"
            ctx.fillText(
              `${node.product_count} products`,
              node.x,
              node.y + node.radius + 16 / k
            )
          }
        } else {
          ctx.font = `500 ${8.5 / k}px sans-serif`
          ctx.fillStyle = "#18181b"
          const displayTitle =
            node.name.length > 20 ? node.name.slice(0, 18) + "…" : node.name
          ctx.fillText(displayTitle, node.x, node.y + node.radius + 3 / k)
        }
      }

      ctx.globalAlpha = 1
    })

    ctx.restore()
  }

  // Find node under screen coordinates
  const getNodeAtPoint = (screenX: number, screenY: number): GraphNode | null => {
    const canvas = canvasRef.current
    if (!canvas) return null
    const rect = canvas.getBoundingClientRect()
    const mouseX = screenX - rect.left
    const mouseY = screenY - rect.top

    const { x: panX, y: panY, k } = transformRef.current
    const worldX = (mouseX - panX) / k
    const worldY = (mouseY - panY) / k

    for (let i = nodes.length - 1; i >= 0; i--) {
      const node = nodes[i]
      const dx = worldX - node.x
      const dy = worldY - node.y
      if (dx * dx + dy * dy <= (node.radius + 4) * (node.radius + 4)) {
        return node
      }
    }
    return null
  }

  // Mouse Handlers: Pan, Drag & Hover
  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const node = getNodeAtPoint(e.clientX, e.clientY)
    if (node) {
      draggedNodeRef.current = node
      setSelectedNode(node)
    } else {
      isDraggingCanvasRef.current = true
      dragStartRef.current = { x: e.clientX, y: e.clientY }
    }
  }

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (draggedNodeRef.current) {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const { x: panX, y: panY, k } = transformRef.current
      const worldX = (e.clientX - rect.left - panX) / k
      const worldY = (e.clientY - rect.top - panY) / k

      draggedNodeRef.current.x = worldX
      draggedNodeRef.current.y = worldY
      draggedNodeRef.current.vx = 0
      draggedNodeRef.current.vy = 0
    } else if (isDraggingCanvasRef.current) {
      const dx = e.clientX - dragStartRef.current.x
      const dy = e.clientY - dragStartRef.current.y
      transformRef.current.x += dx
      transformRef.current.y += dy
      dragStartRef.current = { x: e.clientX, y: e.clientY }
    } else {
      const node = getNodeAtPoint(e.clientX, e.clientY)
      setHoveredNode(node)
      if (node) {
        setHoverPos({ x: e.clientX, y: e.clientY })
      } else {
        setHoverPos(null)
      }
    }
  }

  const handleMouseUp = () => {
    draggedNodeRef.current = null
    isDraggingCanvasRef.current = false
  }

  // Mouse Wheel Zoom
  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault()
    const canvas = canvasRef.current
    if (!canvas) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const mouseY = e.clientY - rect.top

    const zoomFactor = e.deltaY < 0 ? 1.12 : 0.89
    const { x, y, k } = transformRef.current
    const newK = Math.max(0.18, Math.min(3.5, k * zoomFactor))

    // Zoom centered on mouse
    transformRef.current = {
      x: mouseX - (mouseX - x) * (newK / k),
      y: mouseY - (mouseY - y) * (newK / k),
      k: newK,
    }
  }

  return (
    <div className="relative w-full h-[calc(100vh-85px)] bg-white border border-neutral-200 rounded-lg overflow-hidden flex flex-col font-sans select-none">
      {/* Top Floating Control Bar (Neo4j Toolbar) */}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2 bg-white/95 backdrop-blur border border-neutral-200 shadow-xs px-3 py-1.5 rounded-lg text-xs">
        <div className="relative">
          <MagnifyingGlass className="absolute left-2 top-2 w-3.5 h-3.5 text-neutral-400" />
          <input
            type="text"
            placeholder="Search nodes in graph..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-7 pr-2 py-1 text-xs bg-neutral-50 border border-neutral-200 rounded focus:bg-white focus:outline-none w-48"
          />
        </div>

        {/* Category Filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          className="text-xs bg-neutral-50 border border-neutral-200 rounded px-2 py-1 focus:outline-none"
        >
          <option value="all">All Categories ({categories.length})</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c.replace(/-/g, " ")}
            </option>
          ))}
        </select>

        <div className="h-4 w-[1px] bg-neutral-200 mx-1" />

        {/* Zoom & Fit Buttons */}
        <button
          onClick={() => {
            const { x, y, k } = transformRef.current
            transformRef.current = { x, y, k: Math.min(3.5, k * 1.25) }
          }}
          className="p-1 hover:bg-neutral-100 rounded text-neutral-700 font-mono font-bold"
          title="Zoom In"
        >
          +
        </button>
        <button
          onClick={() => {
            const { x, y, k } = transformRef.current
            transformRef.current = { x, y, k: Math.max(0.2, k * 0.8) }
          }}
          className="p-1 hover:bg-neutral-100 rounded text-neutral-700 font-mono font-bold"
          title="Zoom Out"
        >
          −
        </button>
        <button
          onClick={handleFitView}
          className="px-2 py-0.5 hover:bg-neutral-100 rounded text-neutral-700 font-medium text-[11px]"
          title="Fit to Screen"
        >
          Fit View
        </button>

        {/* Physics Toggle */}
        <button
          onClick={() => setIsPhysicsRunning(!isPhysicsRunning)}
          className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
            isPhysicsRunning
              ? "bg-neutral-100 text-neutral-800"
              : "bg-neutral-900 text-white"
          }`}
        >
          {isPhysicsRunning ? "Pause Physics" : "Resume"}
        </button>
      </div>

      {/* Top Right Legend */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-3 bg-white/90 backdrop-blur border border-neutral-200 px-3 py-1.5 rounded-lg text-[11px] text-neutral-600 shadow-xs">
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-neutral-900 inline-block border border-white" />
          Category Anchor
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2.5 h-2.5 rounded-full bg-white inline-block border border-neutral-700" />
          Product
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-3 h-3 rounded-full bg-neutral-900 text-white inline-flex items-center justify-center text-[8px]">
            ★
          </span>
          Reviewed Product
        </span>
        <span className="font-mono text-neutral-400">
          {nodes.length} nodes · {links.length} relationships
        </span>
      </div>

      {/* Main Canvas Area */}
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onWheel={handleWheel}
        className="w-full h-full cursor-grab active:cursor-grabbing"
      />

      {/* Neo4j Hover Tooltip */}
      {hoveredNode && hoverPos && !draggedNodeRef.current && (
        <div
          className="fixed pointer-events-none z-50 bg-neutral-950/95 text-white border border-neutral-800 rounded-lg p-2.5 shadow-xl text-xs backdrop-blur max-w-xs transition-opacity"
          style={{
            left: Math.min(window.innerWidth - 260, hoverPos.x + 14),
            top: Math.min(window.innerHeight - 150, hoverPos.y + 14),
          }}
        >
          <div className="flex items-center gap-1.5 mb-1">
            <span className="uppercase font-mono text-[9px] px-1 py-0.2 bg-neutral-800 text-neutral-300 rounded">
              {hoveredNode.type}
            </span>
            {hoveredNode.rating && (
              <span className="text-[10px] font-mono text-amber-400 font-semibold">
                ★ {hoveredNode.rating.toFixed(1)}
              </span>
            )}
          </div>
          <p className="font-semibold text-neutral-100 text-xs leading-snug">
            {hoveredNode.name}
          </p>
          {hoveredNode.category && (
            <p className="text-[10px] text-neutral-400 mt-0.5">
              Category: {hoveredNode.category}
            </p>
          )}
          {hoveredNode.price && (
            <p className="text-[10px] font-mono font-medium text-emerald-400 mt-1">
              ₹{hoveredNode.price} INR
            </p>
          )}
          {hoveredNode.product_count !== undefined && (
            <p className="text-[10px] text-neutral-400 mt-1">
              Connected: {hoveredNode.product_count} products
            </p>
          )}
        </div>
      )}

      {/* Neo4j Node Inspector Side Drawer (When Node Selected) */}
      {selectedNode && (
        <div className="absolute bottom-4 right-4 z-20 w-80 bg-white/95 backdrop-blur border border-neutral-200 rounded-xl shadow-lg p-4 font-sans text-neutral-900 animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-2.5 mb-3">
            <div>
              <span className="uppercase font-mono text-[9px] tracking-wider px-1.5 py-0.5 bg-neutral-100 text-neutral-700 rounded font-semibold">
                {selectedNode.type}
              </span>
              <h3 className="font-bold text-sm text-neutral-900 mt-1 leading-tight">
                {selectedNode.name}
              </h3>
            </div>
            <button
              onClick={() => setSelectedNode(null)}
              className="text-neutral-400 hover:text-neutral-900 p-1 text-xs font-mono"
            >
              ✕
            </button>
          </div>

          <div className="space-y-2 text-xs text-neutral-600 mb-4">
            {selectedNode.category && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Category:</span>
                <span className="font-medium text-neutral-800">{selectedNode.category}</span>
              </div>
            )}
            {selectedNode.price && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Price:</span>
                <span className="font-mono font-bold text-neutral-900">₹{selectedNode.price} INR</span>
              </div>
            )}
            {selectedNode.rating && (
              <div className="flex items-center justify-between">
                <span className="text-neutral-400">Rating:</span>
                <span className="font-semibold text-neutral-900">★ {selectedNode.rating.toFixed(1)} / 5.0</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-neutral-400">Identifier:</span>
              <span className="font-mono text-[10px] text-neutral-500 truncate max-w-[140px]">
                {selectedNode.slug}
              </span>
            </div>
          </div>

          <Button
            variant="secondary"
            size="small"
            className="w-full text-xs font-medium bg-neutral-900 text-white hover:bg-neutral-800"
            onClick={() => onSelectDossier(selectedNode.path)}
          >
            Open Full Markdown Dossier →
          </Button>
        </div>
      )}
    </div>
  )
}
