"use client"

import { useEffect, useState, useCallback, useMemo } from "react"
import { PROBLEM_VIEWER_URL } from "@/lib/constants"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, Languages, Clock, HardDrive, ExternalLink, Copy, Check, Minus, Plus, Type, Sigma } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DifficultyBadge } from "@/components/problem/difficulty-badge"
import { marked } from "marked"
import katex from "katex"
import "katex/dist/katex.min.css"

// ===== Types (mirror vjudge CoreProblem / CoreProblemStatement) =====

interface CoreProblem {
  name: string
  description: { content: string; description_type: "Markdown" | "Html" | "Typst" }
  platform: string
  limit: { time_limit: number; memory_limit: number }
  difficulty: { NumberStyle: number } | { LuoguStyle: string } | "None"
  is_remote: boolean
  is_sync: boolean
  sync_url: string | null
  sign: string | null
}

interface CoreProblemStatement {
  statement_type: "Markdown" | "Html" | "Pdf" | "Typst"
  content: string
  is_translate: boolean
  language: "Chinese" | "English" | "Japanese" | "Russian"
}

interface ProblemViewerData {
  problem: CoreProblem
  statements: CoreProblemStatement[]
  meta: {
    iden: string
    tags: string[]
    sample_group: [string, string][]
    created_at: string
  }
}

// ===== Helpers =====

function formatTimeLimit(ms: number) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(ms % 1000 === 0 ? 0 : 1)}s` : `${ms}ms`
}

function formatMemoryLimit(kb: number) {
  if (kb >= 1048576) return `${(kb / 1048576).toFixed(1)}GB`
  if (kb >= 1024) return `${(kb / 1024).toFixed(0)}MB`
  return `${kb}KB`
}

function languageLabel(lang: string) {
  const map: Record<string, string> = {
    Chinese: "中文", English: "English", Japanese: "日本語", Russian: "Русский"
  }
  return map[lang] || lang
}

function platformLabel(platform: string) {
  const map: Record<string, string> = {
    Codeforces: "Codeforces",
    codeforces: "Codeforces",
    AtCoder: "AtCoder",
    atcoder: "AtCoder",
    Luogu: "洛谷",
    luogu: "洛谷",
  }
  return map[platform] || platform
}

/** 用 KaTeX 渲染单个 LaTeX 公式，出错时回退为原文 */
function renderKatex(tex: string, displayMode: boolean): string {
  try {
    return katex.renderToString(tex, { displayMode, throwOnError: false, strict: false })
  } catch {
    return displayMode ? `<div class="math-block">$$${tex}$$</div>` : `<span class="math-inline">$${tex}$</span>`
  }
}

/** 将 HTML 字符串中的 LaTeX 公式用 KaTeX 渲染 */
function renderMathInHtml(html: string): string {
  // 块公式 $$...$$ 
  html = html.replace(/\$\$([\s\S]+?)\$\$/g, (_m, tex: string) => renderKatex(tex, true))
  // 行内公式 $...$（排除 $$ 和纯数字如 $5）
  html = html.replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_m, tex: string) => renderKatex(tex, false))
  return html
}

/** 使用 marked 将 Markdown 渲染为 HTML，并用 KaTeX 渲染数学公式 */
function renderMarkdownToHtml(md: string): string {
  // 先保护 LaTeX 公式不被 marked 破坏
  const mathSlots: { placeholder: string; rendered: string }[] = []
  let processed = md
    // 块公式 $$...$$
    .replace(/\$\$([\s\S]+?)\$\$/g, (_match, formula: string) => {
      const idx = mathSlots.length
      const placeholder = `%%MATHBLOCK${idx}%%`
      mathSlots.push({ placeholder, rendered: renderKatex(formula, true) })
      return placeholder
    })
    // 行内公式 $...$
    .replace(/(?<!\$)\$([^$\n]+?)\$(?!\$)/g, (_match, formula: string) => {
      const idx = mathSlots.length
      const placeholder = `%%MATHINLINE${idx}%%`
      mathSlots.push({ placeholder, rendered: renderKatex(formula, false) })
      return placeholder
    })

  let html = marked.parse(processed, { async: false }) as string

  // 还原已渲染的公式
  for (const { placeholder, rendered } of mathSlots) {
    html = html.replace(placeholder, rendered)
  }

  return html
}

// ===== Sub-components =====

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }, [text])
  return (
    <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleCopy}>
      {copied ? <Check className="h-3 w-3 text-green-600" /> : <Copy className="h-3 w-3 text-muted-foreground" />}
    </Button>
  )
}

function SampleBlock({ input, output, index }: { input: string; output: string; index: number }) {
  return (
    <div className="grid grid-cols-2 gap-3">
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-muted-foreground">输入 #{index + 1}</span>
          <CopyButton text={input} />
        </div>
        <pre className="bg-muted/60 border rounded-md p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all overflow-x-auto max-h-60">
          {input}
        </pre>
      </div>
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs font-semibold text-muted-foreground">输出 #{index + 1}</span>
          <CopyButton text={output} />
        </div>
        <pre className="bg-muted/60 border rounded-md p-3 text-xs font-mono leading-relaxed whitespace-pre-wrap break-all overflow-x-auto max-h-60">
          {output}
        </pre>
      </div>
    </div>
  )
}

type FontSize = "sm" | "base" | "lg"

const FONT_SIZE_LABELS: Record<FontSize, string> = { sm: "小", base: "中", lg: "大" }

const proseBaseClasses = `max-w-none dark:prose-invert
  prose-headings:font-semibold prose-headings:text-foreground prose-headings:mt-6 prose-headings:mb-3
  prose-h2:text-xl prose-h2:border-b prose-h2:pb-2
  prose-h3:text-lg
  prose-h4:text-base
  prose-p:text-foreground/80 prose-p:leading-7 prose-p:my-2
  prose-pre:bg-muted prose-pre:border prose-pre:rounded-md
  prose-code:text-sm prose-code:font-mono
  prose-strong:text-foreground prose-strong:font-semibold
  prose-img:rounded-md prose-img:border
  prose-table:border-collapse prose-th:border prose-th:p-2 prose-th:bg-muted/50
  prose-td:border prose-td:p-2
  prose-ul:my-2 prose-ol:my-2 prose-li:my-0.5
  prose-a:text-blue-600 prose-a:no-underline hover:prose-a:underline`

const proseSizeClass: Record<FontSize, string> = {
  sm: "prose prose-sm",
  base: "prose prose-base",
  lg: "prose prose-lg",
}

function getProseClasses(size: FontSize): string {
  return `${proseSizeClass[size]} ${proseBaseClasses}`
}

function StatementRenderer({ statement, sampleGroup, fontSize = "base" }: { statement: CoreProblemStatement; sampleGroup?: [string, string][]; fontSize?: FontSize }) {
  // 将 [samples] 占位符分割，中间插入 SampleBlock 组件
  const SAMPLES_MARKER = "[samples]"
  const hasSamplesMarker = statement.content.includes(SAMPLES_MARKER)
  const samples = sampleGroup || []

  const segments = useMemo(() => {
    const render = (text: string) => {
      if (statement.statement_type === "Html") return renderMathInHtml(text)
      return renderMarkdownToHtml(text)
    }

    if (!hasSamplesMarker) {
      return [{ type: "html" as const, html: render(statement.content) }]
    }

    const parts = statement.content.split(SAMPLES_MARKER)
    const result: { type: "html" | "samples"; html?: string }[] = []
    for (let i = 0; i < parts.length; i++) {
      const trimmed = parts[i].trim()
      if (trimmed) {
        result.push({ type: "html", html: render(trimmed) })
      }
      if (i < parts.length - 1) {
        result.push({ type: "samples" })
      }
    }
    return result
  }, [statement.content, statement.statement_type, hasSamplesMarker])

  return (
    <div>
      {segments.map((seg, i) => {
        if (seg.type === "samples") {
          return samples.length > 0 ? (
            <div key={`samples-${i}`} className="my-6">
              <h4 className="text-sm font-semibold mb-3">样例</h4>
              <div className="space-y-4">
                {samples.map(([inp, out], j) => (
                  <SampleBlock key={j} input={inp} output={out} index={j} />
                ))}
              </div>
            </div>
          ) : null
        }
        return (
          <div
            key={`html-${i}`}
            className={getProseClasses(fontSize)}
            dangerouslySetInnerHTML={{ __html: seg.html! }}
          />
        )
      })}
    </div>
  )
}

// ===== Loading skeleton =====

function ViewerSkeleton() {
  return (
    <div className="space-y-4 mt-4">
      <div className="space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-3/6" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
      </div>
      <div className="grid grid-cols-2 gap-3 mt-6">
        <Skeleton className="h-24 w-full" />
        <Skeleton className="h-24 w-full" />
      </div>
    </div>
  )
}

// ===== Main component =====

interface ProblemStatementViewerProps {
  /** 题目标识符，如 "codeforces.1234.A" */
  problemIden: string
  /** 题目 sign（vjudge iden），如 "CF1000A"，优先使用 */
  sign?: string
  /** 自定义 viewer 服务地址（不传则用环境变量） */
  viewerUrl?: string
  /** 是否默认展开 */
  defaultOpen?: boolean
}

export function generateCandidates(key: string): string[] {
      const candidates: string[] = []
      // AT sign 格式: ATabc296G → abc296_g
      const atMatch = key.match(/^AT([a-z]+?[0-9]+?)([A-Z][0-9]*)$/i)
      if (atMatch) {
        candidates.push(`${atMatch[1].toLowerCase()}_${atMatch[2].toLowerCase()}`)
      }
      // 路径格式: atcoder/abc296/G → abc296_g
      const pathMatch = key.match(/^(?:atcoder\/)?([a-z0-9_-]+)\/([a-zA-Z][a-z0-9]*)$/i)
      if (pathMatch) {
        candidates.push(`${pathMatch[1].toLowerCase()}_${pathMatch[2].toLowerCase()}`)
      }
      return candidates
    }

export function ProblemStatementViewer({
  problemIden,
  sign,
  viewerUrl,
  defaultOpen = true,
}: ProblemStatementViewerProps) {
  const [data, setData] = useState<ProblemViewerData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("original")
  const [refreshKey, setRefreshKey] = useState(0)
  const [fontSize, setFontSize] = useState<FontSize>("base")

  const cycleFontSize = useCallback(() => {
    setFontSize(prev => {
      const order: FontSize[] = ["sm", "base", "lg"]
      return order[(order.indexOf(prev) + 1) % order.length]
    })
  }, [])

  const baseUrl = viewerUrl || PROBLEM_VIEWER_URL

  // 监听来自 ActionMode 的刷新事件
  useEffect(() => {
    const handler = () => setRefreshKey(k => k + 1)
    window.addEventListener("problem-viewer-refresh", handler)
    return () => window.removeEventListener("problem-viewer-refresh", handler)
  }, [])

  useEffect(() => {
    if (!problemIden && !sign) return

    let cancelled = false
    setLoading(true)
    setError(null)

    // 优先使用 sign（vjudge iden），然后回退到 problemIden
    const lookupKey = sign || problemIden

    /**
     * 从各种格式生成可能的数据库 iden 候选
     * atcoder/abc296/G → abc296_g
     * ATabc296G → abc296_g
     */
    

    async function fetchData() {
      // 尝试直接查询
      let res = await fetch(`${baseUrl}/api/problems/${encodeURIComponent(lookupKey)}`)

      // 如果 sign 查找失败，再尝试用 problemIden
      if (!res.ok && sign && sign !== problemIden) {
        res = await fetch(`${baseUrl}/api/problems/${encodeURIComponent(problemIden)}`)
      }

      // 尝试 iden 格式转换候选（如 AtCoder: atcoder/abc296/G → abc296_g）
      if (!res.ok) {
        const allCandidates = [
          ...generateCandidates(lookupKey),
          ...(sign && sign !== problemIden ? generateCandidates(problemIden) : []),
        ]
        for (const candidate of allCandidates) {
          res = await fetch(`${baseUrl}/api/problems/${encodeURIComponent(candidate)}`)
          if (res.ok) break
        }
      }

      // 如果都失败了，尝试用搜索 API
      if (!res.ok) {
        const searchRes = await fetch(`${baseUrl}/api/problems?search=${encodeURIComponent(problemIden)}&limit=1`)
        if (searchRes.ok) {
          const searchData = await searchRes.json()
          if (searchData.items?.length > 0) {
            const foundIden = searchData.items[0].iden
            res = await fetch(`${baseUrl}/api/problems/${encodeURIComponent(foundIden)}`)
          }
        }
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null)
        throw new Error(body?.message || `Problem Viewer 中未找到该题目`)
      }

      return res.json()
    }

    fetchData()
      .then((json: ProblemViewerData) => {
        if (!cancelled) {
          setData(json)
          const hasTranslation = json.statements.some(s => s.is_translate)
          if (hasTranslation) setActiveTab("translated")
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => { cancelled = true }
  }, [problemIden, sign, baseUrl, refreshKey])

  if (!defaultOpen && !data && !loading) return null

  return (
    <div className="mt-4">
      {/* Loading */}
      {loading && <ViewerSkeleton />}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
          <AlertCircle className="h-4 w-4 text-orange-500" />
          <span>无法加载题面：{error}</span>
        </div>
      )}

      {data && !loading && (
        <div className="space-y-5">
          {/* 字体大小调节 */}
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-muted-foreground"
              onClick={() => setFontSize("sm")}
              data-active={fontSize === "sm"}
            >
              <Minus className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1"
              onClick={cycleFontSize}
            >
              <Type className="h-3.5 w-3.5" />
              <span className="text-muted-foreground">{FONT_SIZE_LABELS[fontSize]}</span>
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs gap-1 text-muted-foreground"
              onClick={() => setFontSize("lg")}
            >
              <Plus className="h-3 w-3" />
            </Button>
          </div>

          {/* 正文内容：直接显示，tabs 在有多语言时出现 */}
          {data.statements.length > 1 ? (
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-3">
                {data.statements.map((s, i) => {
                  const tabValue = s.language === "Formal" ? "formal" : s.is_translate ? "translated" : "original"
                  return (
                    <TabsTrigger key={i} value={tabValue}>
                      {s.language === "Formal" ? (
                        <><Sigma className="h-3 w-3 mr-1" />形式化</>
                      ) : (
                        <><Languages className="h-3 w-3 mr-1" />{s.is_translate ? "中文翻译" : languageLabel(s.language)}</>
                      )}
                    </TabsTrigger>
                  )
                })}
              </TabsList>
              {data.statements.map((s, i) => {
                const tabValue = s.language === "Formal" ? "formal" : s.is_translate ? "translated" : "original"
                return (
                  <TabsContent key={i} value={tabValue}>
                    <StatementRenderer statement={s} sampleGroup={data.meta.sample_group} fontSize={fontSize} />
                  </TabsContent>
                )
              })}
            </Tabs>
          ) : data.statements.length === 1 ? (
            <StatementRenderer statement={data.statements[0]} sampleGroup={data.meta.sample_group} fontSize={fontSize} />
          ) : (
            <p className="text-sm text-muted-foreground py-4">暂无题面内容</p>
          )}

          {/* 如果 statement 中没有 [samples] 占位符，则在底部独立显示样例 */}
          {data.meta.sample_group.length > 0 && !data.statements.some(s => s.content.includes("[samples]")) && (
            <>
              <Separator />
              <div>
                <h4 className="text-sm font-semibold mb-3">样例</h4>
                <div className="space-y-4">
                  {data.meta.sample_group.map(([inp, out], i) => (
                    <SampleBlock key={i} input={inp} output={out} index={i} />
                  ))}
                </div>
              </div>
            </>
          )}

          {/* 底部元信息 */}
          <Separator />
          <div className="flex items-center gap-4 flex-wrap text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5">
              <Clock className="h-3.5 w-3.5" />
              <span>时间限制: <strong className="text-foreground">{formatTimeLimit(data.problem.limit.time_limit)}</strong></span>
            </div>
            <div className="flex items-center gap-1.5">
              <HardDrive className="h-3.5 w-3.5" />
              <span>内存限制: <strong className="text-foreground">{formatMemoryLimit(data.problem.limit.memory_limit)}</strong></span>
            </div>
            {data.problem.difficulty !== "None" && (
              <DifficultyBadge difficulty={data.problem.difficulty} size="sm" />
            )}
            <span className="text-muted-foreground/60">·</span>
            <span>{platformLabel(data.problem.platform)}</span>
            <span className="text-muted-foreground/60">·</span>
            <span>{data.meta.iden}</span>
            {data.problem.is_remote && (
              <>
                <span className="text-muted-foreground/60">·</span>
                <span>远程评测</span>
              </>
            )}
            <a
              href={`${baseUrl}/problem/${encodeURIComponent(data.meta.iden)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="ml-auto inline-flex items-center gap-1 text-muted-foreground/60 hover:text-foreground transition-colors"
            >
              <ExternalLink className="h-3 w-3" />
              在 Viewer 中打开
            </a>
          </div>
        </div>
      )}
    </div>
  )
}
