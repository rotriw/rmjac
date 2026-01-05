"use client"

import { useEffect, useRef, useState } from "react"
import { $typst } from "@myriaddreamin/typst.ts"
import {
  preloadFontAssets,
  preloadRemoteFonts,
} from "@myriaddreamin/typst.ts/dist/esm/options.init.mjs"

import "./typst.css"

let typstInitPromise: Promise<void> | null = null

function isAlreadyInitializedError(err: unknown) {
  const message = err instanceof Error ? err.message : String(err)
  return message.includes("compiler has been initialized") || message.includes("renderer has been initialized")
}

async function ensureTypstInitialized() {
  if (typstInitPromise) return typstInitPromise

  typstInitPromise = (async () => {
    try {
      $typst.setCompilerInitOptions({
        getModule: async () => {
          const wasmUrl = new URL(
            "@myriaddreamin/typst-ts-web-compiler/pkg/typst_ts_web_compiler_bg.wasm",
            import.meta.url,
          )
          const wasmResponse = await fetch(wasmUrl)
          if (!wasmResponse.ok) {
            throw new Error(`Failed to fetch compiler WASM: ${wasmResponse.status}`)
          }
          return await wasmResponse.arrayBuffer()
        },
        beforeBuild: [
          async (_, { builder }) => {
            builder.set_dummy_access_model()
          },
          preloadRemoteFonts([
            "https://fonts.gstatic.com/s/roboto/v15/7MygqTe2zs9YkP0adA9QQQ.ttf",
            "https://fonts.gstatic.com/s/roboto/v15/T1xnudodhcgwXCmZQ490TPesZW2xOQ-xsNqO47m55DA.ttf",
            "https://fonts.gstatic.com/s/roboto/v15/dtpHsbgPEm2lVWciJZ0P-A.ttf",
            "https://fonts.gstatic.com/s/roboto/v15/iE8HhaRzdhPxC93dOdA056CWcynf_cDxXwCLxiixG1c.ttf",
            "https://fonts.gstatic.com/s/roboto/v15/W5F8_SL0XFawnjxHGsZjJA.ttf",
            "https://fonts.gstatic.com/s/roboto/v15/hcKoSgxdnKlbH5dlTwKbow.ttf",
            "https://fonts.gstatic.com/s/roboto/v15/Uxzkqj-MIMWle-XP2pDNAA.ttf",
            "https://fonts.gstatic.com/s/roboto/v15/daIfzbEw-lbjMyv4rMUUTqCWcynf_cDxXwCLxiixG1c.ttf",
            "https://fonts.gstatic.com/s/roboto/v15/bdHGHleUa-ndQCOrdpfxfw.ttf",
            "https://fonts.gstatic.com/s/roboto/v15/owYYXKukxFDFjr0ZO8NXh6CWcynf_cDxXwCLxiixG1c.ttf",
            "https://fonts.gstatic.com/s/roboto/v15/H1vB34nOKWXqzKotq25pcg.ttf",
            "https://fonts.gstatic.com/s/roboto/v15/b9PWBSMHrT2zM5FgUdtu0aCWcynf_cDxXwCLxiixG1c.ttf",
          ]),
          preloadFontAssets({ assets: ["cjk", "text"] }),
        ],
      })
    } catch (err) {
      if (!isAlreadyInitializedError(err)) throw err
    }

    try {
      $typst.setRendererInitOptions({
        getModule: async () => {
          const wasmUrl = new URL(
            "@myriaddreamin/typst-ts-renderer/pkg/typst_ts_renderer_bg.wasm",
            import.meta.url,
          )
          const wasmResponse = await fetch(wasmUrl)
          if (!wasmResponse.ok) {
            throw new Error(`Failed to fetch renderer WASM: ${wasmResponse.status}`)
          }
          return await wasmResponse.arrayBuffer()
        },
      })
    } catch (err) {
      if (!isAlreadyInitializedError(err)) throw err
    }
  })()

  return typstInitPromise
}

interface TypstRendererProps {
  content: string
  className?: string
  html?: string
  scrollPercentage?: number
}

export function TypstRenderer({ content, className = "", html, scrollPercentage }: TypstRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    if (html) {
      containerRef.current.innerHTML = html
      setIsLoading(false)
      return
    }

    let cancelled = false

    const renderTypst = async () => {
      if (!content) {
        containerRef.current!.innerHTML = ""
        setError(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        await ensureTypstInitialized()

        let counter = 0
        const promises: Array<Promise<void>> = []

        const printContent = content.replaceAll(
          /image\("(.*?)(.png|.jpg)",/g,
          (_match: string, p1: string, p2: string) => {
            const downloadUrl = `${p1}${p2}`
            const nowCounter = counter++

            const fetchImage = async (count: number, ext: string, url: string) => {
              const nowImage = await (await fetch(url)).arrayBuffer()
              $typst.mapShadow(`/local/${count}${ext}`, new Uint8Array(nowImage))
            }

            promises.push(fetchImage(nowCounter, p2, downloadUrl))
            return `image("/local/${nowCounter}${p2}",`
          },
        )

        await Promise.all(promises)

        const result = await $typst.svg({
          mainContent: `
          #set rect(width: 100%)
          #set page(width: 40cm,height:auto,margin:(top: 0cm,bottom: 0cm,x: 0cm,y: 0cm))
          #set text(size: 16pt)
          #set footnote(numbering: "*")
          #let bmod = math.op("mod")
          #let pmod(x) = $space (mod #x)$
          #let lvert = symbol("|");
          #let rvert = symbol("|");
          #let colored(col, content) = text(col, content)
          #let plus = symbol(
            "+",
            ("o", symbol(math.xor))
          )
          #set quote(block: true)
          #let overset(top, base) = math.attach(base, t: top)
          #let underset(bot, base) = math.attach(base, b: bot)
          #let over(numerator, denominator) = math.frac(numerator, denominator)
          #show quote: it => block(
            stroke: (left: 2pt + black),
            spacing: 10pt,
            inset: (y: 10pt),
            block(
              text(font: "Georgia", size: 16pt)[
                #it
              ]
            ),
          )
          #let epigraph = (
            wrapper: (body) => {
              set align(right)
              block(width: 100%, inset: (y: 1em), body)
            },
            text: (body) => {
              stack(
                dir: ttb,
                spacing: 0.8em,
                body,
                line(length: 100%, stroke: 0.5pt + black)
              )
            },
            source: (body) => {
              v(0.0em)
              align(right, body)
            }
          )
          ${printContent}\\`,
        })

        if (cancelled) return

        if (result && containerRef.current) {
          containerRef.current.innerHTML = result
          containerRef.current.querySelectorAll("svg").forEach((svg) => {
            svg.setAttribute("width", "auto")
            svg.setAttribute("height", "auto")
          })
        }
      } catch (err) {
        if (cancelled) return
        const message = err instanceof Error ? err.message : "Typst渲染失败"
        setError(message)
        if (containerRef.current) containerRef.current.innerHTML = ""
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    }

    void renderTypst()

    return () => {
      cancelled = true
    }
  }, [content])

  useEffect(() => {
    if (containerRef.current && scrollPercentage !== undefined) {
      const container = containerRef.current.parentElement
      if (container) {
        const maxScrollTop = container.scrollHeight - container.clientHeight
        if (maxScrollTop > 0) {
          container.scrollTop = maxScrollTop * scrollPercentage
        }
      }
    }
  }, [scrollPercentage])

  return (
    <div className={`typst-container ${className}`}>
      {isLoading && <div className="text-gray-500 text-sm">Typst渲染中...</div>}
      {error && (
        <div className="text-red-500 text-sm p-2 border border-red-200 rounded bg-red-50">
          Typst渲染失败: {error}
        </div>
      )}
      <div ref={containerRef} className="w-full" />
    </div>
  )
}