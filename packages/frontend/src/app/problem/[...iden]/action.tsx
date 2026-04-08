"use client"

import { useState, useEffect, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { ButtonGroup } from "@/components/ui/button-group";
import Link from "next/link";
import { MarkProblemDialog } from "@/api-components/record/mark-problem-dialog";
import { useRouter } from "next/navigation";
import { PROBLEM_VIEWER_URL } from "@/lib/constants";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Languages, Loader2, RefreshCw, AlertCircle, Download, CheckCircle2, Sigma } from "lucide-react";
import { postAddProblem, postCreate, postList } from "@/api/client/api_training_todo";
import type { TodoListItem } from "@rmjac/api-declare";
import { toast } from "sonner";

// ===== 翻译对话框 =====

interface TranslateModel {
  id: string
  name: string
}

type TranslatePhase = "idle" | "streaming" | "done" | "error"

function getCookieValue(name: string): string | undefined {
  if (typeof document === "undefined") return undefined
  const key = `${name}=`
  const found = document.cookie
    .split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(key))
  if (!found) return undefined
  return decodeURIComponent(found.slice(key.length))
}

function getViewerAuth() {
  const uid =
    getCookieValue("_uid") ||
    getCookieValue("uid") ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("_uid") || localStorage.getItem("uid") || undefined : undefined)

  const token =
    getCookieValue("token") ||
    (typeof localStorage !== "undefined" ? localStorage.getItem("token") || undefined : undefined)

  return { uid, token }
}

function withViewerAuthHeaders(headers?: HeadersInit): HeadersInit {
  const normalized: Record<string, string> = {}

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key] = value
    })
  } else if (Array.isArray(headers)) {
    for (const [key, value] of headers) {
      normalized[key] = value
    }
  } else if (headers) {
    Object.assign(normalized, headers)
  }

  const { uid, token } = getViewerAuth()
  if (uid && token) {
    normalized["X-UID"] = uid
    normalized["X-TOKEN"] = token
  }

  return normalized
}

async function viewerAuthFetch(input: string, init?: RequestInit): Promise<Response> {
  return fetch(input, {
    ...init,
    credentials: "include",
    headers: withViewerAuthHeaders(init?.headers),
  })
}



function TranslateDialog({
  open,
  onOpenChange,
  baseUrl,
  iden,
  sign,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseUrl: string
  iden: string
  sign?: string
}) {
  const router = useRouter();
  const [models, setModels] = useState<TranslateModel[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [phase, setPhase] = useState<TranslatePhase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [translationInfo, setTranslationInfo] = useState<{ model: string; translated_at: string } | null>(null)
  const [streamContent, setStreamContent] = useState("")
  const [streamLen, setStreamLen] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const viewerIden = sign || iden;

  // 自动滚动到最新位置
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [streamContent])

  useEffect(() => {
    if (!open) return
    setError(null)
    setStreamContent("")
    setStreamLen(0)
    setPhase("idle")

    viewerAuthFetch(`${baseUrl}/api/translate/models`)
      .then(r => r.json())
      .then((d: { models: TranslateModel[] }) => {
        setModels(d.models)
        if (d.models.length > 0 && !selectedModel) {
          setSelectedModel(d.models[0].id)
        }
      })
      .catch(() => setModels([]))

    viewerAuthFetch(`${baseUrl}/api/translate/status/${encodeURIComponent(viewerIden)}`)
      .then(r => r.json())
      .then((d: { has_translation: boolean; model: string | null; translated_at: string | null }) => {
        if (d.has_translation && d.model && d.translated_at) {
          setTranslationInfo({ model: d.model, translated_at: d.translated_at })
        } else {
          setTranslationInfo(null)
        }
      })
      .catch(() => {})
  }, [open, baseUrl, viewerIden])

  const handleTranslate = useCallback(async () => {
    setPhase("streaming")
    setError(null)
    setStreamContent("")
    setStreamLen(0)

    try {
      const { uid, token } = getViewerAuth()
      const res = await viewerAuthFetch(`${baseUrl}/api/translate/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iden: viewerIden, model: selectedModel, uid, token }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message || `请求失败 (${res.status})`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("浏览器不支持流式读取")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)
            switch (event.type) {
              case "start":
                // 翻译开始
                break
              case "chunk":
                setStreamContent(prev => prev + event.delta)
                setStreamLen(event.length)
                break
              case "done":
                setPhase("done")
                setTranslationInfo({ model: selectedModel, translated_at: new Date().toISOString() })
                // 延迟刷新
                setTimeout(() => {
                  router.refresh()
                  window.dispatchEvent(new CustomEvent("problem-viewer-refresh"))
                }, 500)
                break
              case "error":
                throw new Error(event.message || "翻译失败")
            }
          } catch (parseErr: any) {
            if (parseErr.message && !parseErr.message.includes("JSON")) {
              throw parseErr
            }
          }
        }
      }

      // 如果流结束但状态没更新到 done（可能是意外断开）
      setPhase(prev => prev === "streaming" ? "done" : prev)
    } catch (e: any) {
      setPhase("error")
      setError(e.message || "翻译失败")
    }
  }, [baseUrl, viewerIden, selectedModel, router])

  const isTranslating = phase === "streaming"
  const isDone = phase === "done"

  return (
    <Dialog open={open} onOpenChange={isTranslating ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Languages className="h-4 w-4" />
            翻译题面
            {isTranslating && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                已输出 {streamLen} 字符
              </span>
            )}
            {isDone && (
              <span className="text-xs font-normal text-green-600 ml-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                翻译完成
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* 已有翻译信息 */}
          {translationInfo && phase === "idle" && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
              <div>已有翻译（模型: <strong>{translationInfo.model}</strong>）</div>
              <div>翻译时间: {new Date(translationInfo.translated_at).toLocaleString("zh-CN")}</div>
              <div className="text-orange-600 mt-1">重新翻译将覆盖现有翻译</div>
            </div>
          )}

          {/* 模型选择 */}
          {!isTranslating && !isDone && (
            <div className="space-y-2">
              <label className="text-sm font-medium">选择模型</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="选择翻译模型" />
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                题目 iden: <code className="bg-muted px-1 py-0.5 rounded">{viewerIden}</code>
              </div>
            </div>
          )}

          {/* AI 实时输出区域 */}
          {(isTranslating || isDone || (phase === "error" && streamContent)) && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {isTranslating ? "AI 正在翻译..." : "翻译结果"}
                </span>
                {isTranslating && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="h-48 overflow-y-auto rounded-md border bg-muted/20">
                <div className="p-3 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed text-muted-foreground/70">
                  {streamContent}
                  {isTranslating && (
                    <span className="inline-block w-1.5 h-3.5 bg-muted-foreground/40 animate-pulse ml-0.5 align-middle" />
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isTranslating}>
            {isDone ? "关闭" : "取消"}
          </Button>
          {!isDone && (
            <Button onClick={handleTranslate} disabled={isTranslating || !selectedModel}>
              {isTranslating ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />翻译中…</>
              ) : translationInfo ? (
                <><RefreshCw className="h-3.5 w-3.5 mr-1" />重新翻译</>
              ) : (
                "开始翻译"
              )}
            </Button>
          )}
          {isDone && (
            <Button onClick={() => onOpenChange(false)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              完成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== 形式化对话框 =====

type FormalizePhase = "idle" | "streaming" | "done" | "error"

function FormalizeDialog({
  open,
  onOpenChange,
  baseUrl,
  iden,
  sign,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseUrl: string
  iden: string
  sign?: string
}) {
  const router = useRouter();
  const [models, setModels] = useState<TranslateModel[]>([])
  const [selectedModel, setSelectedModel] = useState("")
  const [phase, setPhase] = useState<FormalizePhase>("idle")
  const [error, setError] = useState<string | null>(null)
  const [formalizeInfo, setFormalizeInfo] = useState<{ model: string; formalized_at: string } | null>(null)
  const [streamContent, setStreamContent] = useState("")
  const [streamLen, setStreamLen] = useState(0)
  const bottomRef = useRef<HTMLDivElement>(null)

  const viewerIden = sign || iden

  // 自动滚动到最新位置
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [streamContent])

  useEffect(() => {
    if (!open) return
    setError(null)
    setStreamContent("")
    setStreamLen(0)
    setPhase("idle")

    viewerAuthFetch(`${baseUrl}/api/translate/models`)
      .then(r => r.json())
      .then((d: { models: TranslateModel[] }) => {
        setModels(d.models)
        if (d.models.length > 0 && !selectedModel) {
          setSelectedModel(d.models[0].id)
        }
      })
      .catch(() => setModels([]))

    viewerAuthFetch(`${baseUrl}/api/formalize/status/${encodeURIComponent(viewerIden)}`)
      .then(r => r.json())
      .then((d: { has_formalization: boolean; model: string | null; formalized_at: string | null }) => {
        if (d.has_formalization && d.model && d.formalized_at) {
          setFormalizeInfo({ model: d.model, formalized_at: d.formalized_at })
        } else {
          setFormalizeInfo(null)
        }
      })
      .catch(() => {})
  }, [open, baseUrl, viewerIden])

  const handleFormalize = useCallback(async () => {
    setPhase("streaming")
    setError(null)
    setStreamContent("")
    setStreamLen(0)

    try {
      const { uid, token } = getViewerAuth()
      const res = await viewerAuthFetch(`${baseUrl}/api/formalize/stream`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iden: viewerIden, model: selectedModel, uid, token }),
      })

      if (!res.ok) {
        const json = await res.json().catch(() => ({}))
        throw new Error(json.message || `请求失败 (${res.status})`)
      }

      const reader = res.body?.getReader()
      if (!reader) throw new Error("浏览器不支持流式读取")

      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split("\n")
        buffer = lines.pop() || ""

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue
          const jsonStr = line.slice(6).trim()
          if (!jsonStr) continue

          try {
            const event = JSON.parse(jsonStr)
            switch (event.type) {
              case "start":
                break
              case "chunk":
                setStreamContent(prev => prev + event.delta)
                setStreamLen(event.length)
                break
              case "done":
                setPhase("done")
                setFormalizeInfo({ model: selectedModel, formalized_at: new Date().toISOString() })
                setTimeout(() => {
                  router.refresh()
                  window.dispatchEvent(new CustomEvent("problem-viewer-refresh"))
                }, 500)
                break
              case "error":
                throw new Error(event.message || "形式化失败")
            }
          } catch (parseErr: any) {
            if (parseErr.message && !parseErr.message.includes("JSON")) {
              throw parseErr
            }
          }
        }
      }

      setPhase(prev => prev === "streaming" ? "done" : prev)
    } catch (e: any) {
      setPhase("error")
      setError(e.message || "形式化失败")
    }
  }, [baseUrl, viewerIden, selectedModel, router])

  const isProcessing = phase === "streaming"
  const isDone = phase === "done"

  return (
    <Dialog open={open} onOpenChange={isProcessing ? undefined : onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sigma className="h-4 w-4" />
            形式化题面
            {isProcessing && (
              <span className="text-xs font-normal text-muted-foreground ml-2">
                已输出 {streamLen} 字符
              </span>
            )}
            {isDone && (
              <span className="text-xs font-normal text-green-600 ml-2 flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3" />
                形式化完成
              </span>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          {/* 已有形式化信息 */}
          {formalizeInfo && phase === "idle" && (
            <div className="text-xs text-muted-foreground bg-muted/50 rounded-md p-3 space-y-1">
              <div>已有形式化结果（模型: <strong>{formalizeInfo.model}</strong>）</div>
              <div>生成时间: {new Date(formalizeInfo.formalized_at).toLocaleString("zh-CN")}</div>
              <div className="text-orange-600 mt-1">重新生成将覆盖现有结果</div>
            </div>
          )}

          {/* 模型选择 */}
          {!isProcessing && !isDone && (
            <div className="space-y-2">
              <label className="text-sm font-medium">选择模型</label>
              <Select value={selectedModel} onValueChange={setSelectedModel}>
                <SelectTrigger>
                  <SelectValue placeholder="选择模型" />
                </SelectTrigger>
                <SelectContent>
                  {models.map(m => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">
                将题面转化为精炼的数学形式化表述（定义、约束、目标）
              </div>
            </div>
          )}

          {/* AI 实时输出区域 */}
          {(isProcessing || isDone || (phase === "error" && streamContent)) && (
            <div>
              <div className="flex items-center gap-2 mb-1.5">
                <span className="text-xs font-medium text-muted-foreground">
                  {isProcessing ? "AI 正在形式化..." : "形式化结果"}
                </span>
                {isProcessing && <Loader2 className="h-3 w-3 animate-spin text-muted-foreground" />}
              </div>
              <div className="h-48 overflow-y-auto rounded-md border bg-muted/20">
                <div className="p-3 text-xs font-mono whitespace-pre-wrap break-all leading-relaxed text-muted-foreground/70">
                  {streamContent}
                  {isProcessing && (
                    <span className="inline-block w-1.5 h-3.5 bg-muted-foreground/40 animate-pulse ml-0.5 align-middle" />
                  )}
                  <div ref={bottomRef} />
                </div>
              </div>
            </div>
          )}

          {/* 错误信息 */}
          {error && (
            <div className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={isProcessing}>
            {isDone ? "关闭" : "取消"}
          </Button>
          {!isDone && (
            <Button onClick={handleFormalize} disabled={isProcessing || !selectedModel}>
              {isProcessing ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />处理中…</>
              ) : formalizeInfo ? (
                <><RefreshCw className="h-3.5 w-3.5 mr-1" />重新生成</>
              ) : (
                "开始形式化"
              )}
            </Button>
          )}
          {isDone && (
            <Button onClick={() => onOpenChange(false)}>
              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
              完成
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== 获取/更新题面对话框 =====

/**
 * 根据 iden 推断平台和构造 URL
 * 支持格式:
 *   codeforces/1000/A → codeforces, CF1000A
 *   atcoder/abc296/G  → atcoder, abc296_g
 */
function detectPlatformAndUrl(iden: string, sign?: string): {
  platform: "codeforces" | "atcoder" | null
  defaultUrl: string
} {
  // 从路径格式推断
  const parts = iden.split("/")

  if (parts[0] === "codeforces" && parts.length >= 3) {
    return {
      platform: "codeforces",
      defaultUrl: `https://codeforces.com/problemset/problem/${parts[1]}/${parts[2]}`,
    }
  }

  if (parts[0] === "atcoder" && parts.length >= 3) {
    return {
      platform: "atcoder",
      defaultUrl: `https://atcoder.jp/contests/${parts[1]}/tasks/${parts[1]}_${parts[2].toLowerCase()}`,
    }
  }

  // 从 sign 推断
  if (sign) {
    const cfMatch = sign.match(/^CF(\d+)([A-Z]\d*)$/i)
    if (cfMatch) {
      return {
        platform: "codeforces",
        defaultUrl: `https://codeforces.com/problemset/problem/${cfMatch[1]}/${cfMatch[2]}`,
      }
    }
    const atMatch = sign.match(/^AT([a-z0-9_-]+?)([A-Z][a-z0-9]*)$/i)
    if (atMatch) {
      return {
        platform: "atcoder",
        defaultUrl: `https://atcoder.jp/contests/${atMatch[1]}/tasks/${atMatch[1]}_${atMatch[2].toLowerCase()}`,
      }
    }
  }

  return { platform: null, defaultUrl: "" }
}

function FetchProblemDialog({
  open,
  onOpenChange,
  baseUrl,
  iden,
  sign,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  baseUrl: string
  iden: string
  sign?: string
}) {
  const router = useRouter();
  const { platform: detectedPlatform, defaultUrl } = detectPlatformAndUrl(iden, sign)
  const [platform, setPlatform] = useState<"codeforces" | "atcoder">(detectedPlatform || "codeforces")
  const [url, setUrl] = useState(defaultUrl)
  const [fetching, setFetching] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<{ success: number; failed: number; results: any[] } | null>(null)

  // 当对话框打开时重置状态
  useEffect(() => {
    if (open) {
      const { platform: dp, defaultUrl: du } = detectPlatformAndUrl(iden, sign)
      setPlatform(dp || "codeforces")
      setUrl(du)
      setError(null)
      setResult(null)
    }
  }, [open, iden, sign])

  const handleFetch = async () => {
    if (!url.trim()) {
      setError("请输入题目 URL")
      return
    }
    setFetching(true)
    setError(null)
    setResult(null)
    try {
      const res = await fetch(`${baseUrl}/api/fetch/${platform}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      })
      const json = await res.json()
      if (!res.ok) {
        throw new Error(json.message || "获取失败")
      }
      setResult(json)
      if (json.success > 0) {
        // 获取成功，延迟关闭并刷新
        setTimeout(() => {
          onOpenChange(false)
          router.refresh()
          window.dispatchEvent(new CustomEvent("problem-viewer-refresh"))
        }, 1500)
      }
    } catch (e: any) {
      setError(e.message || "获取失败")
    } finally {
      setFetching(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-4 w-4" />
            获取/更新题面
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <label className="text-sm font-medium">平台</label>
            <Select value={platform} onValueChange={(v: "codeforces" | "atcoder") => setPlatform(v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="codeforces">Codeforces</SelectItem>
                <SelectItem value="atcoder">AtCoder</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">题目 URL</label>
            <Input
              placeholder={platform === "codeforces"
                ? "https://codeforces.com/problemset/problem/1000/A"
                : "https://atcoder.jp/contests/abc296/tasks/abc296_g"
              }
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">
              也支持简写格式，如 {platform === "codeforces" ? "CF1000A 或 1000A" : "abc296_g"}
            </p>
          </div>

          {error && (
            <div className="text-sm text-red-500 flex items-center gap-1">
              <AlertCircle className="h-3.5 w-3.5" />
              {error}
            </div>
          )}

          {result && (
            <div className={`text-sm rounded-md p-3 ${result.success > 0 ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
              {result.success > 0 ? (
                <div>✅ 成功获取 {result.success} 个题目{result.results[0]?.action === "updated" ? "（已更新）" : "（新增）"}</div>
              ) : (
                <div>❌ 获取失败: {result.results[0]?.error || "未知错误"}</div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={fetching}>
            取消
          </Button>
          <Button onClick={handleFetch} disabled={fetching || !url.trim()}>
            {fetching ? (
              <><Loader2 className="h-3.5 w-3.5 animate-spin mr-1" />获取中…</>
            ) : (
              "开始获取"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
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

function AddToTodoDialog({
  open,
  onOpenChange,
  problemIden,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  problemIden: string
}) {
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [todos, setTodos] = useState<TodoListItem[]>([])
  const [selectedTodoId, setSelectedTodoId] = useState<string>("")
  const [newTodoDescription, setNewTodoDescription] = useState("")

  useEffect(() => {
    if (!open) return
    setLoading(true)
    postList()
      .then((resp) => {
        const items = resp.todos || []
        setTodos(items)
        if (items.length > 0) {
          setSelectedTodoId(String(items[0].id))
        }
      })
      .catch((error) => {
        toast.error(error instanceof Error ? error.message : "获取题单失败")
      })
      .finally(() => setLoading(false))
  }, [open])

  const handleCreateTodo = async () => {
    if (!newTodoDescription.trim()) {
      toast.error("请输入新题单描述")
      return
    }
    setSubmitting(true)
    try {
      await postCreate({ color: "#3b82f6", description: newTodoDescription.trim() })
      const resp = await postList()
      const items = resp.todos || []
      setTodos(items)
      if (items.length > 0) {
        setSelectedTodoId(String(items[items.length - 1].id))
      }
      setNewTodoDescription("")
      toast.success("题单创建成功")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建题单失败")
    } finally {
      setSubmitting(false)
    }
  }

  const handleAdd = async () => {
    if (!selectedTodoId) {
      toast.error("请先选择题单")
      return
    }
    setSubmitting(true)
    try {
      await postAddProblem({
        todo_id: Number(selectedTodoId),
        problem_iden: problemIden,
        description: "",
      })
      toast.success("已加入题单")
      onOpenChange(false)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加入题单失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>加入题单</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="space-y-2">
            <label className="text-sm font-medium">选择已有题单</label>
            <Select value={selectedTodoId} onValueChange={setSelectedTodoId}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "加载中..." : "请选择题单"} />
              </SelectTrigger>
              <SelectContent>
                {todos.map((todo) => (
                  <SelectItem key={todo.id} value={String(todo.id)}>
                    #{todo.id} · {todo.description}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">或创建新题单</label>
            <div className="flex gap-2">
              <Input
                placeholder="新题单描述"
                value={newTodoDescription}
                onChange={(e) => setNewTodoDescription(e.target.value)}
              />
              <Button variant="outline" onClick={handleCreateTodo} disabled={submitting}>
                创建
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={submitting}>
            取消
          </Button>
          <Button onClick={handleAdd} disabled={submitting || !selectedTodoId}>
            加入
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// ===== ActionMode 主组件 =====

export function ActionMode({ iden, sign }: { iden: string; sign?: string }) {
  const router = useRouter();
  const [showMark, setShowMark] = useState(false);
  const [showTodo, setShowTodo] = useState(false);
  const [showTranslate, setShowTranslate] = useState(false);
  const [showFormalize, setShowFormalize] = useState(false);
  const [showFetch, setShowFetch] = useState(false);
  const problemIden = iden;
  const baseUrl = PROBLEM_VIEWER_URL;

  return (<>
    <ButtonGroup className="mb-2">
      <ButtonGroup>
        <Button variant="outline" onClick={() => setShowMark(true)}>标记题目</Button>
        <Button variant="outline" asChild>
          <Link href={`/record?problemIden=${encodeURIComponent(problemIden)}`}>历史提交</Link>
        </Button>
        <Button variant="outline" onClick={() => setShowTodo(true)}>加入题单</Button>
        <Button variant="outline" onClick={() => setShowFetch(true)}>
          <Download className="h-3.5 w-3.5 mr-1" />
          更新/获取题面
        </Button>
        <Button variant="outline" onClick={() => setShowTranslate(true)}>
          <Languages className="h-3.5 w-3.5 mr-1" />
          翻译题面
        </Button>
        <Button variant="outline" onClick={() => setShowFormalize(true)}>
          <Sigma className="h-3.5 w-3.5 mr-1" />
          形式化题面
        </Button>
      </ButtonGroup>
    </ButtonGroup>

    <MarkProblemDialog
      problemIden={problemIden}
      open={showMark}
      onOpenChange={setShowMark}
      onSuccess={() => router.refresh()}
    />

    <AddToTodoDialog
      open={showTodo}
      onOpenChange={setShowTodo}
      problemIden={problemIden}
    />

    <TranslateDialog
      open={showTranslate}
      onOpenChange={setShowTranslate}
      baseUrl={baseUrl}
      iden={iden}
      sign={generateCandidates(sign || iden)[0]}
    />

    <FormalizeDialog
      open={showFormalize}
      onOpenChange={setShowFormalize}
      baseUrl={baseUrl}
      iden={iden}
      sign={generateCandidates(sign || iden)[0]}
    />

    <FetchProblemDialog
      open={showFetch}
      onOpenChange={setShowFetch}
      baseUrl={baseUrl}
      iden={iden}
      sign={generateCandidates(sign || iden)[0]}
    />
  </>)
}