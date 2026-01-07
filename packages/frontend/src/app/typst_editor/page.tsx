"use client"

import React, { useEffect, useState } from "react"
import { TypstEditor } from "@/components/typst-editor"
import { TypstRenderer } from "@/components/typst-renderer"
import { exportDocument, type ExportKind } from "@/lib/typst-lsp"

function base64ToUint8Array(b64: string) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

function downloadBytes(bytes: Uint8Array, filename: string, mime?: string) {
  const blob = new Blob([bytes], { type: mime || "application/octet-stream" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

interface ExportPayloadItem {
  data: string;
  page?: number;
  [key: string]: unknown; // Allow other properties
}

interface ExportPayload {
  data?: string; // For single export
  items?: ExportPayloadItem[]; // For multi-page export
  [key: string]: unknown; // Allow other properties
}

function findExportPayload(obj: unknown, depth = 0): ExportPayload | null {
  if (!obj || depth > 6) return null
  if (typeof obj !== "object") return null

  const rec = obj as Record<string, unknown>
  if (typeof rec.data === "string") return rec as ExportPayload
  if (Array.isArray(rec.items)) {
    const first = rec.items.find((x) => x && typeof x === "object" && typeof (x as ExportPayloadItem).data === "string")
    if (first) return rec as ExportPayload
  }

  for (const k of Object.keys(rec)) {
    const v = rec[k]
    if (v && typeof v === "object") {
      const found = findExportPayload(v, depth + 1)
      if (found) return found
    }
  }

  return null
}

export default function TypstEditorPage() {
  const [content, setContent] = useState<string>("# Hello Typst!")
  const [previewContent, setPreviewContent] = useState<string>("# Hello Typst!")
  const [previewHtml, setPreviewHtml] = useState<string>("")
  const [scrollPercentage, setScrollPercentage] = useState<number>(0)
  const [exportKind, setExportKind] = useState<ExportKind>("pdf")
  const [isExporting, setIsExporting] = useState(false)

  // 处理 POST 导入内容
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data && event.data.type === "IMPORT_TYPST_CONTENT") {
        setContent(event.data.content)
        setPreviewContent(event.data.content)
      }
    }
    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const handleEditorChange = (newContent: string) => {
    setContent(newContent)
    // 实时更新预览内容
    setPreviewContent(newContent)
  }

  const handleScroll = (_scrollTop: number, percentage?: number) => {
    if (percentage !== undefined) {
      setScrollPercentage(percentage)
    }
  }

  const handleExport = async () => {
    try {
      setIsExporting(true)
      const resp = await exportDocument(exportKind, content)
      const payload = findExportPayload(resp)
      if (!payload) {
        console.warn("Export returned unexpected shape:", resp)
        return
      }

      const mime =
        exportKind === "pdf"
          ? "application/pdf"
          : exportKind === "svg"
            ? "image/svg+xml"
            : "image/png"

      if (typeof payload.data === "string") {
        downloadBytes(base64ToUint8Array(payload.data), `main.${exportKind}`, mime)
        return
      }

      if (Array.isArray(payload.items)) {
        let count = 0
        for (const item of payload.items) {
          if (!item || typeof item !== "object") continue
          const data = (item as any).data
          if (typeof data !== "string") continue
          const page = typeof (item as any).page === "number" ? (item as any).page : count
          downloadBytes(base64ToUint8Array(data), `main-p${page + 1}.${exportKind}`, mime)
          count++
        }
      }
    } catch (e) {
      console.error("Export failed:", e)
    } finally {
      setIsExporting(false)
    }
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden flex-col">
      <div className="flex items-center gap-2 p-2 border-b border-gray-200">
        <select
          className="border border-gray-200 rounded px-2 py-1 text-sm"
          value={exportKind}
          onChange={(e) => setExportKind(e.target.value as ExportKind)}
          disabled={isExporting}
        >
          <option value="pdf">PDF</option>
          <option value="svg">SVG</option>
          <option value="png">PNG</option>
        </select>
        <button
          className="border border-gray-200 rounded px-3 py-1 text-sm bg-white"
          onClick={handleExport}
          disabled={isExporting}
        >
          {isExporting ? "Exporting..." : "Export"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/2 h-full border-r border-gray-200">
          <TypstEditor
            value={content}
            onChange={handleEditorChange}
            height="100%"
            className="h-full"
            onScroll={handleScroll}
            onRender={(html) => setPreviewHtml(html)}
          />
        </div>
        <div className="w-1/2 h-full bg-gray-50 p-4 overflow-auto">
          <div className="bg-white shadow-lg min-h-full p-8">
            <TypstRenderer
              content={previewContent}
              html={previewHtml}
              scrollPercentage={scrollPercentage}
            />
          </div>
        </div>
      </div>
    </div>
  )
}