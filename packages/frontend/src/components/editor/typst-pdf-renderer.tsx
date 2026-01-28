"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import { exportDocument } from "@/lib/typst-lsp"

function base64ToUint8Array(b64: string) {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return bytes
}

type ExportItem = { data: string; page?: number }
type ExportPayload = { data?: string; items?: ExportItem[] }

function isRecord(v: unknown): v is Record<string, unknown> {
  return Boolean(v) && typeof v === "object"
}

function isExportItem(v: unknown): v is ExportItem {
  if (!isRecord(v)) return false
  return typeof v.data === "string" && (v.page === undefined || typeof v.page === "number")
}

function findExportPayload(obj: unknown, depth = 0): ExportPayload | null {
  if (!obj || depth > 6) return null
  if (!isRecord(obj)) return null

  const rec = obj
  if (typeof rec.data === "string") return rec as ExportPayload
  if (Array.isArray(rec.items)) {
    const items = rec.items.filter(isExportItem)
    if (items.length > 0) return { items }
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

function wrapWithResponsivePage(content: string, widthPx: number) {
  // CSS px -> pt (assume 96dpi): 1px = 72/96 pt.
  const widthPt = Math.max(200, Math.floor((widthPx * 72) / 96))
  // Keep it minimal: only control page width, avoid styling surprises.
  return `#set page(width: ${widthPt}pt, margin: 0pt)\n#set text(font: ("Noto Sans CJK SC", "Noto Sans SC", "Source Han Sans SC"))\n${content}`
}

export function TypstPdfRenderer({ content, className = "" }: { content: string; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasHostRef = useRef<HTMLDivElement>(null)
  const [containerWidth, setContainerWidth] = useState(0)
  const [pdfBytes, setPdfBytes] = useState<Uint8Array | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const ro = new ResizeObserver((entries) => {
      const w = Math.floor(entries[0]?.contentRect?.width ?? 0)
      setContainerWidth(w)
    })

    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  const responsiveContent = useMemo(() => {
    if (!containerWidth) return content
    return wrapWithResponsivePage(content, containerWidth)
  }, [content, containerWidth])

  useEffect(() => {
    if (!responsiveContent) {
      setError(null)
      setPdfBytes(null)
      return
    }

    let cancelled = false
    let timeout: ReturnType<typeof setTimeout> | null = null

    const run = async () => {
      setIsLoading(true)
      setError(null)
      try {
        const resp = await exportDocument("pdf", responsiveContent)
        const payload = findExportPayload(resp)
        if (!payload || typeof payload.data !== "string") {
          throw new Error("exportPdf 返回结构异常")
        }

        const bytes = base64ToUint8Array(payload.data)
        if (cancelled) return
        setPdfBytes(bytes)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    // Debounce: width changes can be frequent.
    timeout = setTimeout(() => void run(), 250)

    return () => {
      cancelled = true
      if (timeout) clearTimeout(timeout)
    }
  }, [responsiveContent])

  // Render PDF bytes via PDF.js onto canvases (avoid Chrome PDF viewer UI/border).
  useEffect(() => {
    const host = canvasHostRef.current
    if (!host) return
    host.innerHTML = ""

    if (!pdfBytes) return

    let cancelled = false

    const render = async () => {
      try {
        type PdfViewport = { width: number; height: number }
        type PdfRenderTask = { promise: Promise<unknown> }
        type PdfPage = {
          getViewport: (opts: { scale: number }) => PdfViewport
          render: (opts: { canvasContext: CanvasRenderingContext2D; viewport: PdfViewport }) => PdfRenderTask
        }
        type PdfDocument = { numPages: number; getPage: (pageNumber: number) => Promise<PdfPage> }

        const pdfjs = await import("pdfjs-dist/build/pdf.mjs")
        // Ensure workerSrc is a *primitive string*; passing a URL object can crash
        // in some environments with: `url.replace is not a function`.
        const workerUrl = new URL("pdfjs-dist/build/pdf.worker.min.mjs", import.meta.url)
        pdfjs.GlobalWorkerOptions.workerSrc = String(workerUrl.href)

        let loadingTask = pdfjs.getDocument({ data: pdfBytes })
        let pdf: PdfDocument
        try {
          pdf = (await loadingTask.promise) as PdfDocument
        } catch (e) {
          const msg = e instanceof Error ? (e.stack || e.message) : String(e)
          // Some environments crash when workerSrc/URL handling ends up passing a non-string
          // into an internal `url.replace(...)` call. Fall back to main-thread parsing.
          if (msg.includes("url.replace is not a function")) {
            loadingTask = pdfjs.getDocument({ data: pdfBytes, disableWorker: true })
            pdf = (await loadingTask.promise) as PdfDocument
          } else {
            throw e
          }
        }
        if (cancelled) return

        for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
          const page = await pdf.getPage(pageNum)
          if (cancelled) return

          const baseViewport = page.getViewport({ scale: 1 })
          const targetWidth = containerWidth > 0 ? containerWidth : baseViewport.width
          const scale = targetWidth / baseViewport.width
          const viewport = page.getViewport({ scale })

          const canvas = document.createElement("canvas")
          const ctx = canvas.getContext("2d")
          if (!ctx) continue

          canvas.width = Math.floor(viewport.width)
          canvas.height = Math.floor(viewport.height)
          canvas.className = "block w-full"

          const wrapper = document.createElement("div")
          wrapper.className = pageNum === 1 ? "" : "mt-4"
          wrapper.appendChild(canvas)
          host.appendChild(wrapper)

          await page.render({ canvasContext: ctx, viewport }).promise
        }
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : String(e))
      }
    }

    void render()
    return () => {
      cancelled = true
    }
  }, [pdfBytes, containerWidth])

  return (
    <div ref={containerRef} className={className}>
      {isLoading && <div className="text-gray-500 text-sm">PDF 编译中...</div>}
      {error && (
        <div className="text-red-500 text-sm p-2 border border-red-200 rounded bg-red-50">
          PDF 编译失败: {error}
        </div>
      )}
      <div ref={canvasHostRef} />
    </div>
  )
}
