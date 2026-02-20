"use client"

import { useEffect, useRef, useState, type SyntheticEvent } from "react"
import { marked } from "marked"

const detectMath = (html: string) => {
  if (!html) return false
  return /\\\(|\\\)|\\\[|\\\]|\$\$\$\$\$\$[^$]+\$\$\$\$\$\$|\$\$\$[^$]+\$\$\$|\$\$[^$]+\$\$|\$[^$]+\$|<math|mathjax|math\/tex/i.test(html)
}

const baseStyle = `
  <style>
    :root { color-scheme: light; }
    html, body { margin: 0; padding: 16px; font-family: Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; color: #111; background: transparent; }
    img, video, canvas, svg { max-width: 100%; height: auto; }
    table { width: 100%; border-collapse: collapse; }
    pre { white-space: pre-wrap; word-break: break-word; }
    code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", Menlo, monospace; }
  </style>
`

interface ProblemFallbackRendererProps {
  pageSource: string | null
  platform?: string | null
}

// Render page_source as HTML/Markdown when structured statements are missing, isolated in iframe.
export default function ProblemFallbackRenderer({ pageSource, platform }: ProblemFallbackRendererProps) {
  const [srcDoc, setSrcDoc] = useState<string>("")
  const iframeRef = useRef<HTMLIFrameElement | null>(null)

  useEffect(() => {
    if (!pageSource) {
      setSrcDoc("")
      return
    }

    const trimmed = pageSource.trim()
    const isMarkdown = trimmed.startsWith("<markdown_render>")
    const isCodeforces =
      (platform && platform.toLowerCase().includes("codeforces")) ||
      trimmed.toLowerCase().includes("codeforces")

    let bodyHtml = ""
    let headAssets = ""
    let needsMath = false

    if (isMarkdown) {
      const markdown = trimmed.replace(/^<markdown_render>/i, "")
      bodyHtml = marked.parse(markdown)
      needsMath = detectMath(markdown)
    } else {
      try {
        const parser = new DOMParser()
        const doc = parser.parseFromString(trimmed, "text/html")

        const cfHolder = isCodeforces ? doc.querySelector(".problemindexholder") : null
        const targetNode = cfHolder || doc.body

        bodyHtml = targetNode?.innerHTML || trimmed

        if (cfHolder) {
          const assets = Array.from(doc.querySelectorAll<HTMLElement>("link[rel='stylesheet'], style"))
          headAssets = assets.map((node) => node.outerHTML).join("\n")
        }

        needsMath = detectMath(trimmed) || !!doc.querySelector("script[type='math/tex'], .MathJax, mjx-container")
      } catch (error) {
        console.error("Failed to parse page_source", error)
        bodyHtml = trimmed
        needsMath = detectMath(trimmed)
        headAssets = ""
      }
    }

    const mathScript = needsMath
      ? isCodeforces
        ? `<script type="text/x-mathjax-config">
            MathJax.Hub.Config({
              tex2jax: { inlineMath: [['$$$','$$$']], displayMath: [['$$$$$$','$$$$$$']], processEscapes: true }
            });
          </script>
          <script src="https://codeforces.com/mathjax.codeforces.org/MathJax.js?config=TeX-AMS_HTML-full" async></script>
          <script>window.addEventListener("load",function(){if(window.MathJax&&MathJax.Hub){MathJax.Hub.Queue(["Typeset",MathJax.Hub]);}});</script>`
        : `<script>
            window.MathJax = {
              tex: {
                inlineMath: [['$$$','$$$'], ['$','$'], ['\\(','\\)']],
                displayMath: [['$$$$$$','$$$$$$'], ['$$','$$'], ['\\[','\\]']],
                processEscapes: true
              }
            };
          </script>
          <script src="https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-mml-chtml.js" async></script>
          <script>window.addEventListener("load",function(){if(window.MathJax&&MathJax.typesetPromise){MathJax.typesetPromise();}});</script>`
      : ""

    const docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8" />${baseStyle}${headAssets}${mathScript}</head><body>${bodyHtml}</body></html>`
    setSrcDoc(docHtml)
  }, [pageSource, platform])

  const handleLoad = (event: SyntheticEvent<HTMLIFrameElement>) => {
    const iframe = event.currentTarget
    try {
      const doc = iframe.contentDocument
      if (!doc) return
      const height = Math.max(doc.body.scrollHeight, doc.documentElement.scrollHeight)
      iframe.style.height = `${height}px`
    } catch (err) {
      console.warn("Adjust iframe height failed", err)
    }
  }

  if (!pageSource) {
    return <div className="text-gray-500">暂无题目描述</div>
  }

  if (!srcDoc) {
    return <div className="text-gray-500">题面加载中...</div>
  }

  return (
    <div className="problem-fallback-html border rounded-md overflow-hidden">
      <iframe
        ref={iframeRef}
        srcDoc={srcDoc}
        sandbox="allow-same-origin allow-scripts"
        loading="lazy"
        className="w-full border-0"
        onLoad={handleLoad}
        title="problem-content"
      />
    </div>
  )
}
