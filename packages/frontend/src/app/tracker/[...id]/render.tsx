"use client"

import { useState, useEffect, useRef, useMemo, useCallback } from "react"
import { useRouter, usePathname, useSearchParams } from "next/navigation"
import { TrackerEventRow, TrackerUser, TrackerCellStatus, StatusMatrix, userKey } from "@/lib/tracker-types"
import { postTrackerStatus } from "@/api/client/api_tracker_status"
import {
  fetchCFUserSubmissions, extractCFSolveStatus,
  fetchATUserSubmissions, extractATSolveStatus,
} from "@/lib/tracker-remote"
import { TrackerTable } from "@/api-components/tracker/tracker-table"
import { TrackerUserSelector } from "@/api-components/tracker/tracker-user-selector"
import { TrackerStats } from "@/api-components/tracker/tracker-stats"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { ArrowDownUp, Filter, Loader2 } from "lucide-react"
import { postCreate } from "@/api/client/api_record_create"
import { postViewNextLevelEventOrderedFull } from "@/api/client/api_event_view"
import { toast } from "sonner"
import type { TrackerInitData, TrackerEventRowData } from "./page"
import type { JudgeResult } from "@rmjac/api-declare"

const PAGE_SIZE = 30

/** 从 cookie 读取 _uid */
function getUidFromCookie(): number | null {
  if (typeof document === "undefined") return null
  const match = document.cookie.split("; ").find(row => row.startsWith("_uid="))
  if (!match) return null
  const val = Number(match.split("=")[1])
  return isNaN(val) ? null : val
}

interface TrackerPageClientProps {
  initData: TrackerInitData[]
  idens: string[]
  initialAsc?: boolean
  initialFilter?: string
  /** URL &user= 参数，格式如 "atcoder:smallfang" 或 "codeforces:tourist" */
  initialUsers?: string[]
}

/** 解析 "platform:handle" 为 TrackerUser */
function parseUserParam(raw: string): TrackerUser | null {
  const idx = raw.indexOf(":")
  if (idx <= 0) return null
  const platform = raw.slice(0, idx).toLowerCase()
  const handle = raw.slice(idx + 1).trim()
  if (!handle) return null
  if (platform === "codeforces" || platform === "cf") {
    return { type: "remote", platform: "codeforces", handle }
  }
  if (platform === "atcoder" || platform === "at") {
    return { type: "remote", platform: "atcoder", handle }
  }
  // 尝试作为本地用户 id
  const id = parseInt(handle)
  if (!isNaN(id)) {
    return { type: "local", userId: id, name: `#${id}` }
  }
  return null
}

export function TrackerPageClient({ initData, idens, initialAsc = false, initialFilter = "", initialUsers = [] }: TrackerPageClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const [uid, setUid] = useState<number | null>(null)
  const [users, setUsers] = useState<TrackerUser[]>(() => {
    const parsed: TrackerUser[] = []
    const seen = new Set<string>()
    for (const raw of initialUsers) {
      const u = parseUserParam(raw)
      if (u) {
        const k = userKey(u)
        if (!seen.has(k)) {
          seen.add(k)
          parsed.push(u)
        }
      }
    }
    return parsed
  })
  const [statusMatrix, setStatusMatrix] = useState<StatusMatrix>(new Map())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshTrigger, setRefreshTrigger] = useState(0)

  // 按 event iden/name 子串过滤（客户端二次过滤，回车会触发 SSR 后端过滤）
  const [filterText, setFilterText] = useState(initialFilter)
  // 默认降序；勾选时 ascOrder=true 切换为升序
  const [ascOrder, setAscOrder] = useState(initialAsc)

  // ─── 懒加载状态 ───
  // 每个 iden 的已加载行数据，初始 = SSR 传入的数据
  const [loadedDataMap, setLoadedDataMap] = useState<Map<string, TrackerEventRowData[]>>(() => {
    const m = new Map<string, TrackerEventRowData[]>()
    for (const init of initData) {
      m.set(init.parentIden, [...init.rows])
    }
    return m
  })
  // 每个 iden 的 total 计数
  const totalMap = useMemo(() => {
    const m = new Map<string, number>()
    for (const init of initData) {
      m.set(init.parentIden, init.total)
    }
    return m
  }, [initData])

  // 是否有 filter（有 filter 时后端已返回全部匹配，不需要懒加载）
  const hasActiveFilter = useMemo(() => {
    return initData.some(d => {
      const f = initialFilter.trim()
      return f.length > 0
    })
  }, [initData, initialFilter])

  // 计算总已加载 / 总量
  const totalLoaded = useMemo(() => {
    let n = 0
    for (const rows of loadedDataMap.values()) n += rows.length
    return n
  }, [loadedDataMap])
  const totalCount = useMemo(() => {
    let n = 0
    for (const t of totalMap.values()) n += t
    return n
  }, [totalMap])
  const hasMore = !hasActiveFilter && totalLoaded < totalCount

  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement | null>(null)

  // 加载下一页
  const loadMore = useCallback(async () => {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)

    try {
      const promises = idens.map(async (iden) => {
        const currentRows = loadedDataMap.get(iden) ?? []
        const total = totalMap.get(iden) ?? 0
        if (currentRows.length >= total) return null

        const res = await postViewNextLevelEventOrderedFull({
          iden,
          desc: !ascOrder,
          offset: currentRows.length,
          limit: PAGE_SIZE,
        })

        if (!res.event || res.event.length === 0) return null

        const newRows: TrackerEventRowData[] = res.event.map(([childEvent, problems]) => {
          const routeIden = childEvent.iden_list?.[0] || childEvent.sign || String(childEvent.id)
          return { iden: `${iden}/${routeIden}`, event: childEvent, problems }
        })

        return { iden, newRows }
      })

      const results = await Promise.all(promises)

      setLoadedDataMap(prev => {
        const next = new Map(prev)
        for (const result of results) {
          if (!result) continue
          const existing = next.get(result.iden) ?? []
          next.set(result.iden, [...existing, ...result.newRows])
        }
        return next
      })
    } catch (e) {
      console.error("Failed to load more events:", e)
    } finally {
      setLoadingMore(false)
    }
  }, [loadingMore, hasMore, idens, loadedDataMap, totalMap, ascOrder])

  // IntersectionObserver 触发懒加载
  useEffect(() => {
    if (!hasMore) return
    const sentinel = sentinelRef.current
    if (!sentinel) return

    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          loadMore()
        }
      },
      { rootMargin: "200px" }
    )
    io.observe(sentinel)
    return () => io.disconnect()
  }, [hasMore, loadMore])

  // 从 cookie 读取 _uid，自动将当前用户加入 users 列表
  const autoAddedRef = useRef(false)
  useEffect(() => {
    const cookieUid = getUidFromCookie()
    setUid(cookieUid)
    if (autoAddedRef.current || !cookieUid) return
    autoAddedRef.current = true
    const meUser: TrackerUser = {
      type: "local",
      userId: cookieUid,
      name: `#${cookieUid}`,
    }
    setUsers(prev => {
      if (prev.some(u => userKey(u) === userKey(meUser))) return prev
      return [meUser, ...prev]
    })
  }, [])

  // loadedDataMap 展平为 rows，并按 iden 自然排序每行的 problems
  // Ex（Extra 题）排在所有普通题之后
  const rows: TrackerEventRow[] = useMemo(() => {
    /** 判断是否为 Ex 题（如 Ex, Ex1, Ex2） */
    const isEx = (s: string) => /^ex\d*$/i.test(s)

    /** 自然排序比较：将字符串拆为字母段和数字段交替比较 */
    const naturalCmp = (a: string, b: string): number => {
      const re = /(\d+|\D+)/g
      const pa = a.match(re) || []
      const pb = b.match(re) || []
      for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const sa = pa[i] ?? ""
        const sb = pb[i] ?? ""
        const na = Number(sa)
        const nb = Number(sb)
        if (!isNaN(na) && !isNaN(nb)) {
          if (na !== nb) return na - nb
        } else {
          const c = sa.localeCompare(sb, undefined, { sensitivity: "base" })
          if (c !== 0) return c
        }
      }
      return 0
    }

    const problemCmp = (a: string, b: string): number => {
      const aEx = isEx(a), bEx = isEx(b)
      if (aEx && !bEx) return 1   // Ex 排后面
      if (!aEx && bEx) return -1
      return naturalCmp(a, b)
    }

    return idens.flatMap(iden => {
      const data = loadedDataMap.get(iden) ?? []
      return data.map(r => ({
        iden: r.iden,
        event: r.event,
        problems: [...r.problems].sort((a, b) => problemCmp(a[1], b[1])),
      }))
    })
  }, [idens, loadedDataMap])

  // 按 event iden / name 子串过滤（客户端实时过滤）
  const displayRows = useMemo(() => {
    const trimmed = filterText.trim()
    if (!trimmed) return rows

    const isExclude = trimmed.startsWith("!")
    const keyword = (isExclude ? trimmed.slice(1) : trimmed).toLowerCase()
    if (!keyword) return rows

    return rows.filter(row => {
      const idenLast = row.iden.split("/").pop()?.toLowerCase() ?? ""
      const name = row.event.name.toLowerCase()
      const contains = idenLast.includes(keyword) || name.includes(keyword)
      return isExclude ? !contains : contains
    })
  }, [rows, filterText])

  const allProblemIds = useMemo(
    () => rows.flatMap(row => row.problems.map(([p]) => p.id)),
    [rows]
  )

  const problemIdToIden = useMemo(() => {
    const m = new Map<number, string>()
    for (const row of rows) {
      for (const [problem, iden] of row.problems) {
        m.set(problem.id, `${row.iden}/${iden}`.toLowerCase())
      }
    }
    return m
  }, [rows])

  const usersKey = useMemo(
    () => users.map(u => userKey(u)).sort().join(","),
    [users]
  )
  const problemIdsKey = useMemo(
    () => allProblemIds.join(","),
    [allProblemIds]
  )

  useEffect(() => {
    if (users.length === 0) {
      setStatusMatrix(new Map())
      return
    }
    if (allProblemIds.length === 0) return

    let cancelled = false
    setLoading(true)
    setError(null)

    const currentRows = rows
    const currentProblemIds = allProblemIds
    const currentProblemIdToIden = problemIdToIden

    ;(async () => {
      const newMatrix: StatusMatrix = new Map()

      try {
        // 1. 本地用户
        const localUsers = users.filter(u => u.type === "local")
        if (localUsers.length > 0 && currentProblemIds.length > 0) {
          try {
            const res = await postTrackerStatus({
              problem_ids: currentProblemIds,
              user_ids: localUsers.map(u => u.userId),
            })
            for (const [uid, pid, passed, score] of res.status) {
              const uKey = `local:${uid}`
              if (!newMatrix.has(uKey)) newMatrix.set(uKey, new Map())
              const pIden = currentProblemIdToIden.get(pid)
              if (pIden) {
                newMatrix.get(uKey)!.set(pIden, { passed, score, source: "local" })
              }
            }
          } catch (e) {
            console.error("Failed to fetch local status:", e)
          }
        }

        // 2. 远程用户
        const remoteUsers = users.filter(u => u.type === "remote")
        for (const user of remoteUsers) {
          if (user.type !== "remote") continue
          const uKey = userKey(user)
          if (!newMatrix.has(uKey)) newMatrix.set(uKey, new Map())

          try {
            let solveMap: Map<string, { passed: boolean; score: number }> | null = null
            if (user.platform === "codeforces") {
              const submissions = await fetchCFUserSubmissions(user.handle)
              solveMap = extractCFSolveStatus(submissions)
            } else if (user.platform === "atcoder") {
              const submissions = await fetchATUserSubmissions(user.handle)
              solveMap = extractATSolveStatus(submissions)
            }

            if (solveMap) {
              for (const row of currentRows) {
                const idenParts = row.iden.toLowerCase().split("/")
                const contestPart = idenParts[idenParts.length - 1] || ""

                for (const [prob, iden] of row.problems) {
                  const fullIden = `${row.iden}/${iden}`.toLowerCase()
                  const shortIden = iden.toLowerCase()

                  const candidateKeys = [
                    shortIden,
                    fullIden,
                    `${contestPart}${shortIden}`,
                    `${contestPart}_${shortIden}`,
                    `cf${contestPart}${shortIden}`,
                  ]
                  if (prob.sign) {
                    candidateKeys.push(prob.sign.toLowerCase())
                  }

                  let data: { passed: boolean; score: number } | undefined
                  for (const key of candidateKeys) {
                    data = solveMap.get(key)
                    if (data) break
                  }

                  if (data && !newMatrix.get(uKey)!.has(fullIden)) {
                    newMatrix.get(uKey)!.set(fullIden, {
                      passed: data.passed,
                      score: data.score,
                      source: "remote",
                    })
                  }
                }
              }
            }
          } catch (e) {
            console.error(`Failed to fetch remote status for ${user.handle}:`, e)
          }
        }
      } catch (e) {
        if (!cancelled) setError("获取通过状态失败")
        console.error(e)
      } finally {
        if (!cancelled) {
          setLoading(false)
          setStatusMatrix(newMatrix)
        }
      }
    })()

    return () => { cancelled = true }
  }, [usersKey, problemIdsKey, refreshTrigger])

  // 通过 URL searchParam 触发 SSR 重新加载（后端排序 + 过滤）
  const navigateWithParams = useCallback((newAsc: boolean, newFilter: string) => {
    const params = new URLSearchParams(searchParams.toString())
    if (newAsc) { params.set("asc", "1") } else { params.delete("asc") }
    const f = newFilter.trim()
    if (f) { params.set("filter", f) } else { params.delete("filter") }
    const qs = params.toString()
    router.replace(qs ? `${pathname}?${qs}` : pathname)
  }, [searchParams, pathname, router])

  const handleToggleAsc = useCallback((checked: boolean) => {
    setAscOrder(checked)
    navigateWithParams(checked, filterText)
  }, [navigateWithParams, filterText])

  const handleFilterKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      navigateWithParams(ascOrder, filterText)
    }
  }, [navigateWithParams, ascOrder, filterText])

  // 右键标记通过状态
  const handleOverrideStatus = useCallback(async (problemIden: string, passed: boolean) => {
    try {
      const status = passed ? "Accepted" : "WrongAnswer"
      const detail: JudgeResult = { "PassedOnly": passed }
      await postCreate({
        problem_iden: problemIden,
        record: {
          code: "",
          problem_id: 0,
          user_id: 0,
          language: "Other",
          judge_detail: {
            is_passed: passed,
            status,
            detail: {
              style: "Archive",
              score: passed ? 100 : 0,
              time: 0,
              memory: 0,
            },
          },
          judge_time: new Date().toISOString(),
          judge_message: "",
        },
        detail,
      })
      toast.success(passed ? "已标记为通过" : "已标记为未通过")
      setRefreshTrigger(prev => prev + 1)
    } catch (e: any) {
      toast.error(e?.message || "标记失败")
    }
  }, [])

  return (
    <div className="mt-4 space-y-4">
      <TrackerUserSelector users={users} onChange={setUsers} />

      {/* 过滤与排序控制栏 */}
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-50 max-w-90">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
          <Input
            placeholder='按事件筛选，如 "abc"；"!abc" 排除（回车应用）'
            value={filterText}
            onChange={e => setFilterText(e.target.value)}
            onKeyDown={handleFilterKeyDown}
            className="h-8 text-sm"
          />
        </div>
        <label className="flex items-center gap-2 cursor-pointer select-none text-sm text-muted-foreground">
          <Checkbox
            checked={ascOrder}
            onCheckedChange={(v) => handleToggleAsc(!!v)}
          />
          <ArrowDownUp className="h-3.5 w-3.5" />
          <span>升序排列</span>
        </label>
      </div>

      <div className="flex items-center gap-3 text-sm text-muted-foreground">
        <span>共 {totalCount} 个事件{totalLoaded < totalCount ? `（已加载 ${totalLoaded}）` : ""}</span>
        {filterText.trim() && <span>（过滤后 {displayRows.length} 个事件）</span>}
      </div>

      <Tabs defaultValue="table">
        <TabsList>
          <TabsTrigger value="table">表格</TabsTrigger>
          <TabsTrigger value="stats">统计</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          {loading && (
            <div className="text-center py-2 text-muted-foreground text-sm">
              正在加载通过状态...
            </div>
          )}
          {error && (
            <div className="text-center py-2 text-red-500 text-sm">{error}</div>
          )}
          <TrackerTable
            rows={displayRows}
            users={users}
            statusMatrix={statusMatrix}
            onOverrideStatus={handleOverrideStatus}
            isLoggedIn={!!uid}
          />
        </TabsContent>

        <TabsContent value="stats">
          <TrackerStats
            rows={displayRows}
            users={users}
            statusMatrix={statusMatrix}
          />
        </TabsContent>
      </Tabs>

      {/* 懒加载哨兵 */}
      {hasMore && (
        <div ref={sentinelRef} className="flex items-center justify-center py-4 text-sm text-muted-foreground gap-2">
          <Loader2 className="h-4 w-4 animate-spin" />
          <span>加载更多…</span>
        </div>
      )}
    </div>
  )
}
