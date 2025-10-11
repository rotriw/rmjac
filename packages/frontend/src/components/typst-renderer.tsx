"use client"

import { useEffect, useRef, useState } from "react"

interface TypstRendererProps {
  content: string
  className?: string
}

export function TypstRenderer({ content, className = "" }: TypstRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current || !content) return

    const renderTypst = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // 动态导入Typst编译器
        const { createTypstCompiler } = await import("@myriaddreamin/typst.ts")

        // 创建编译器实例
        const compiler = await createTypstCompiler()

        // 编译Typst内容为SVG
        const result = await compiler.compile({
          main: content,
        })

        // 将SVG内容渲染到容器中
        if (containerRef.current && result) {
          containerRef.current.innerHTML = result
        }
      } catch (err) {
        console.error("Typst渲染错误:", err)
        setError(err instanceof Error ? err.message : "Typst渲染失败")
        if (containerRef.current) {
          containerRef.current.innerHTML = `<div class="text-red-500 text-sm p-2 border border-red-200 rounded bg-red-50">Typst渲染失败: ${err instanceof Error ? err.message : '未知错误'}</div>`
        }
      } finally {
        setIsLoading(false)
      }
    }

    renderTypst()
  }, [content])

  return (
    <div className={`typst-container ${className}`}>
      {isLoading && (
        <div className="flex items-center justify-center p-4 text-gray-500">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
          渲染Typst内容中...
        </div>
      )}
      <div
        ref={containerRef}
        className="w-full"
        style={{ minHeight: "50px" }}
      />
    </div>
  )
}