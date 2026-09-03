import React from "react"

interface MarkdownRendererProps {
  content: string
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // Simple, robust, pure React Markdown parser for chatbot messages
  const renderFormattedText = (text: string) => {
    // Replace **bold** with <strong>
    const parts = text.split(/(\*\*.*?\*\*|`.*?`|\[.*?\]\(.*?\))/g)
    return parts.map((part, index) => {
      if (part.startsWith("**") && part.endsWith("**")) {
        return (
          <strong key={index} className="font-semibold text-neutral-900">
            {part.slice(2, -2)}
          </strong>
        )
      }
      if (part.startsWith("`") && part.endsWith("`")) {
        return (
          <code key={index} className="bg-gray-100 text-gray-800 px-1 py-0.5 rounded text-[10px] font-mono">
            {part.slice(1, -1)}
          </code>
        )
      }
      if (part.startsWith("[") && part.includes("](") && part.endsWith(")")) {
        const match = part.match(/\[(.*?)\]\((.*?)\)/)
        if (match) {
          const [, linkText, href] = match
          return (
            <a
              key={index}
              href={href}
              target={href.startsWith("http") ? "_blank" : undefined}
              rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
              className="text-blue-600 font-medium underline underline-offset-2 hover:text-blue-800 transition-colors"
            >
              {linkText}
            </a>
          )
        }
      }
      return part
    })
  }

  const lines = content.split("\n")
  const elements: React.ReactNode[] = []
  let tableRows: string[][] = []
  let inTable = false

  const flushTable = (key: string) => {
    if (tableRows.length > 0) {
      const headers = tableRows[0]
      const bodyRows = tableRows.slice(1).filter((r) => !r.every((c) => c.match(/^[-: ]+$/)))

      elements.push(
        <div key={key} className="overflow-x-auto my-2 rounded-lg border border-gray-200">
          <table className="min-w-full text-left border-collapse text-[11px]">
            <thead className="bg-gray-100/90 text-gray-800 font-semibold border-b border-gray-200">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-2.5 py-1.5 border-r last:border-r-0 border-gray-200">
                    {renderFormattedText(h.trim())}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 bg-white">
              {bodyRows.map((row, ri) => (
                <tr key={ri} className="hover:bg-gray-50/50">
                  {row.map((cell, ci) => (
                    <td key={ci} className="px-2.5 py-1.5 border-r last:border-r-0 border-gray-200 text-gray-700">
                      {renderFormattedText(cell.trim())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )
      tableRows = []
      inTable = false
    }
  }

  lines.forEach((line, idx) => {
    const trimmed = line.trim()

    // Detect markdown table line
    if (trimmed.startsWith("|") && trimmed.endsWith("|")) {
      const cells = trimmed
        .slice(1, -1)
        .split("|")
        .map((c) => c.trim())
      tableRows.push(cells)
      inTable = true
      return
    } else if (inTable) {
      flushTable(`table-${idx}`)
    }

    if (!trimmed) {
      return
    }

    // Markdown Image / QR code: ![alt](url)
    if (trimmed.startsWith("![") && trimmed.includes("](") && trimmed.endsWith(")")) {
      const imgMatch = trimmed.match(/^!\[(.*?)\]\((.*?)\)$/)
      if (imgMatch) {
        const [, alt, src] = imgMatch
        const isQr = alt.toLowerCase().includes("qr") || src.startsWith("data:image")
        elements.push(
          <div key={idx} className="my-3 flex flex-col items-center justify-center p-3.5 bg-white border border-gray-200 rounded-xl shadow-sm text-center">
            {isQr && (
              <span className="text-[11px] font-semibold text-neutral-800 mb-2 flex items-center gap-1.5">
                <span>📱 Scan with Google Pay / PhonePe / Paytm</span>
              </span>
            )}
            <img
              src={src}
              alt={alt}
              className="max-w-[200px] w-full h-auto rounded-lg border border-gray-100 shadow-sm"
            />
            <span className="text-[10px] text-gray-500 mt-2 font-medium">
              {alt || "Payment QR Code"}
            </span>
          </div>
        )
        return
      }
    }

    // Headings
    if (trimmed.startsWith("### ")) {
      elements.push(
        <h3 key={idx} className="text-xs font-bold text-neutral-900 mt-2.5 mb-1">
          {renderFormattedText(trimmed.replace("### ", ""))}
        </h3>
      )
    } else if (trimmed.startsWith("## ")) {
      elements.push(
        <h2 key={idx} className="text-xs font-bold text-neutral-900 mt-3 mb-1">
          {renderFormattedText(trimmed.replace("## ", ""))}
        </h2>
      )
    } else if (trimmed.startsWith("# ")) {
      elements.push(
        <h1 key={idx} className="text-sm font-bold text-neutral-900 mt-3 mb-1.5">
          {renderFormattedText(trimmed.replace("# ", ""))}
        </h1>
      )
    } else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      elements.push(
        <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5 text-neutral-700">
          <span className="text-neutral-400 mt-0.5 select-none">•</span>
          <div className="flex-1">{renderFormattedText(trimmed.slice(2))}</div>
        </div>
      )
    } else if (/^\d+\.\s/.test(trimmed)) {
      const numMatch = trimmed.match(/^(\d+)\.\s(.*)/)
      elements.push(
        <div key={idx} className="flex items-start gap-1.5 ml-1 my-0.5 text-neutral-700">
          <span className="text-neutral-500 font-medium select-none">{numMatch ? numMatch[1] + "." : "•"}</span>
          <div className="flex-1">{renderFormattedText(numMatch ? numMatch[2] : trimmed)}</div>
        </div>
      )
    } else if (trimmed === "---") {
      elements.push(<hr key={idx} className="my-2 border-gray-200" />)
    } else {
      elements.push(
        <p key={idx} className="my-1 text-neutral-800 leading-relaxed">
          {renderFormattedText(trimmed)}
        </p>
      )
    }
  })

  if (inTable) {
    flushTable("table-end")
  }

  return <div className="space-y-0.5 text-xs">{elements}</div>
}
