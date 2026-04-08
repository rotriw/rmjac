"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback } from "react"
import Link from "next/link"
import { TrackerEventRow, TrackerUser, TrackerCellStatus, StatusMatrix, userKey, userDisplayName, ProblemBrief } from "@/lib/tracker-types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, XCircle } from "lucide-react"
import { getRatingColor, RATING_COLOR_MAP, RATING_BG_COLOR_MAP, type RatingColor } from "@/lib/difficulty-colors"

interface TrackerTableProps {
  rows: TrackerEventRow[]
  users: TrackerUser[]
  statusMatrix: StatusMatrix
  /** 右键标记通过状态时回调，problemIden 为点号分隔格式如 "codeforces.1923.a" */
  onOverrideStatus?: (problemIden: string, passed: boolean) => void
  /** 是否已登录（控制是否显示右键菜单） */
  isLoggedIn?: boolean
}

/** 生成列标题 A, B, C, ..., Z, AA, AB, ... */
function getColumnLabel(index: number): string {
  let label = ""
  let num = index
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label
    num = Math.floor(num / 26) - 1
  }
  return label
}

/** 获取单格状态 */
function getCellStatus(
  statusMatrix: StatusMatrix,
  uKey: string,
  rowIden: string,
  problemIden: string,
): TrackerCellStatus | null {
  const fullIden = `${rowIden}/${problemIden}`.toLowerCase()
  const userMap = statusMatrix.get(uKey)
  if (!userMap) return null
  return userMap.get(fullIden) || null
}

/** 用户背景色 (浅色用于单元格底色) */
const USER_BG_COLORS = [
  { bg: "bg-blue-200", hover: "hover:bg-blue-300", text: "text-blue-900", dot: "bg-blue-500" },
  { bg: "bg-purple-200", hover: "hover:bg-purple-300", text: "text-purple-900", dot: "bg-purple-500" },
  { bg: "bg-orange-200", hover: "hover:bg-orange-300", text: "text-orange-900", dot: "bg-orange-500" },
  { bg: "bg-pink-200", hover: "hover:bg-pink-300", text: "text-pink-900", dot: "bg-pink-500" },
  { bg: "bg-teal-200", hover: "hover:bg-teal-300", text: "text-teal-900", dot: "bg-teal-500" },
  { bg: "bg-indigo-200", hover: "hover:bg-indigo-300", text: "text-indigo-900", dot: "bg-indigo-500" },
  { bg: "bg-cyan-200", hover: "hover:bg-cyan-300", text: "text-cyan-900", dot: "bg-cyan-500" },
  { bg: "bg-rose-200", hover: "hover:bg-rose-300", text: "text-rose-900", dot: "bg-rose-500" },
]

/** 从 ProblemBrief 提取 rating 数值 */
function getRatingFromProblem(problem: ProblemBrief): number | null {
  const d = problem.difficulty
  if (!d) return null
  if (typeof d === "object" && "NumberStyle" in d) {
    const n = d.NumberStyle
    return n > 0 ? n : null
  }
  return null
}

/** 获取题目难度对应的内联样式（背景 + 文字色） */
function getDifficultyStyle(problem: ProblemBrief): { bg?: string; color?: string } | null {
  const rating = getRatingFromProblem(problem)
  if (rating === null) return null
  const c = getRatingColor(rating)
  return { bg: RATING_BG_COLOR_MAP[c], color: RATING_COLOR_MAP[c] }
}

/**
 * 根据多个用户的状态决定单元格底色
 * 优先级：用户列表中靠左的用户覆盖右侧
 * 返回 { bg, text } 类名
 */
function resolveCellColor(
  users: TrackerUser[],
  enabledSet: Set<string>,
  statusMatrix: StatusMatrix,
  rowIden: string,
  problemIden: string,
): { bg: string; text: string } {
  // 从左到右遍历，最左侧已通过的用户颜色覆盖
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const uK = userKey(u)
    if (!enabledSet.has(uK)) continue
    const status = getCellStatus(statusMatrix, uK, rowIden, problemIden)
    if (status?.passed) {
      const c = USER_BG_COLORS[i % USER_BG_COLORS.length]
      return { bg: `${c.bg} ${c.hover}`, text: c.text }
    }
  }
  // 检查是否有任何已启用用户提交过但未通过
  for (let i = 0; i < users.length; i++) {
    const u = users[i]
    const uK = userKey(u)
    if (!enabledSet.has(uK)) continue
    const status = getCellStatus(statusMatrix, uK, rowIden, problemIden)
    if (status) {
      return { bg: "bg-red-50 hover:bg-red-100", text: "text-red-500" }
    }
  }
  return { bg: "bg-gray-50", text: "text-gray-400" }
}

export function TrackerTable({ rows, users, statusMatrix, onOverrideStatus, isLoggedIn }: TrackerTableProps) {
  // 右键菜单状态
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; dotIden: string; problemName: string } | null>(null)
  const contextMenuRef = useRef<HTMLDivElement>(null)

  // 点击外部或滚动关闭
  useEffect(() => {
    if (!contextMenu) return
    const close = () => setContextMenu(null)
    document.addEventListener("mousedown", (e) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) close()
    })
    document.addEventListener("scroll", close, true)
    return () => {
      document.removeEventListener("mousedown", close)
      document.removeEventListener("scroll", close, true)
    }
  }, [contextMenu])

  const handleContextMenu = useCallback((e: React.MouseEvent, dotIden: string, problemName: string) => {
    e.preventDefault()
    setContextMenu({ x: e.clientX, y: e.clientY, dotIden, problemName })
  }, [])

  // 控制哪些用户参与染色（可通过点击 toggle）
  const [enabledUsers, setEnabledUsers] = useState<Set<string>>(() => new Set(users.map(u => userKey(u))))

  // 当 users 列表变化时同步 enabledUsers（新增的用户默认启用）
  React.useEffect(() => {
    setEnabledUsers(prev => {
      const next = new Set(prev)
      for (const u of users) {
        if (!next.has(userKey(u))) next.add(userKey(u))
      }
      return next
    })
  }, [users])

  const toggleUser = (uK: string) => {
    setEnabledUsers(prev => {
      const next = new Set(prev)
      if (next.has(uK)) {
        next.delete(uK)
      } else {
        next.add(uK)
      }
      return next
    })
  }

  if (rows.length === 0) {
    return <div className="text-center py-8 text-gray-500">暂无事件数据</div>
  }

  const hasUsers = users.length > 0
  const maxColumns = Math.max(...rows.map(row => row.problems.length), 0)
  const totalProblems = rows.reduce((acc, row) => acc + row.problems.length, 0)

  // 没有用户时只显示题目结构
  if (!hasUsers) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>共 {rows.length} 个事件，{totalProblems} 道题目</span>
          <span className="text-xs">添加用户以查看通过状态</span>
        </div>
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-r border-b px-1 py-1.5 text-left font-medium text-xs sticky left-0 bg-muted/50 z-10 max-w-16 w-10">
                  事件
                </th>
                {Array.from({ length: maxColumns }, (_, i) => (
                  <th key={i} className="border-r border-b px-1 py-1.5 text-center font-medium text-xs w-14 max-w-14">
                    {getColumnLabel(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.iden} className="hover:bg-muted/30">
                  <td className="border-r border-b px-1 py-1 text-xs sticky left-0 bg-background z-10 max-w-16 overflow-hidden" title={row.event.name}>
                    <span className="block truncate">{row.iden}</span>
                  </td>
                  {Array.from({ length: maxColumns }, (_, i) => {
                    const prob = row.problems[i]
                    if (!prob) return <td key={i} className="border-r border-b w-14" />
                    const [problem, iden] = prob
                    const ds = getDifficultyStyle(problem)
                    const rating = getRatingFromProblem(problem)
                    return (
                      <td
                        key={iden}
                        className="border-r border-b px-0.5 py-0.5 text-center w-14 max-w-14 overflow-hidden"
                      >
                        <Link
                          href={`/problem/${row.iden}/${iden}`}
                          className="block hover:opacity-80"
                          title={problem.name}
                        >
                          <span className="text-xs font-semibold text-foreground">{iden}</span>
                          <span className="block text-[10px] text-muted-foreground truncate leading-tight">{problem.name}</span>
                          {rating !== null && (
                            <span className="block text-[10px] font-medium leading-tight" style={{ color: ds?.color }}>{rating}</span>
                          )}
                        </Link>
                      </td>
                    )
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-3">
        {/* 图例 + 用户色块（可点击 toggle） */}
        <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-500" />
            <span>已通过</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-red-300" />
            <span>未通过</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300" />
            <span>未提交</span>
          </div>
          <div className="flex items-center gap-2 ml-4 border-l pl-4">
            {users.map((u, idx) => {
              const uK = userKey(u)
              const enabled = enabledUsers.has(uK)
              const c = USER_BG_COLORS[idx % USER_BG_COLORS.length]
              return (
                <button
                  key={uK}
                  onClick={() => toggleUser(uK)}
                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs transition-opacity cursor-pointer ${
                    enabled ? "opacity-100" : "opacity-30 line-through"
                  }`}
                  title={enabled ? `点击隐藏 ${userDisplayName(u)} 的染色` : `点击显示 ${userDisplayName(u)} 的染色`}
                >
                  <div className={`w-2.5 h-2.5 rounded-full ${c.dot}`} />
                  <span>{userDisplayName(u)}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* 表格 */}
        <div className="overflow-x-auto border rounded-lg">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-muted/50">
                <th className="border-r border-b px-1 py-1.5 text-left font-medium text-xs sticky left-0 bg-muted/50 z-10 max-w-16 w-10">
                  事件
                </th>
                {Array.from({ length: maxColumns }, (_, i) => (
                  <th key={i} className="border-r border-b px-1 py-1.5 text-center font-medium text-xs w-14 max-w-14">
                    {getColumnLabel(i)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowPassed = row.problems.filter(([, iden]) =>
                  users.some(u => {
                    if (!enabledUsers.has(userKey(u))) return false
                    const s = getCellStatus(statusMatrix, userKey(u), row.iden, iden)
                    return s?.passed
                  })
                ).length
                const allPassed = rowPassed === row.problems.length && row.problems.length > 0

                return (
                  <tr key={row.iden} className="hover:bg-muted/30">
                    <td
                      className={`border-r border-b px-1 py-1 text-xs sticky left-0 z-10 max-w-16 overflow-hidden ${allPassed ? "bg-green-50" : "bg-background"}`}
                      title={row.event.name}
                    >
                      <Link
                        href={`/event/${row.iden}`}
                        className="block truncate hover:underline"
                      >
                        {row.iden}
                      </Link>
                      <span className="block text-[10px] text-muted-foreground truncate">
                        {rowPassed}/{row.problems.length}
                      </span>
                    </td>
                    {Array.from({ length: maxColumns }, (_, i) => {
                      const prob = row.problems[i]
                      if (!prob) return <td key={i} className="border-r border-b w-14" />
                      const [problem, iden] = prob

                      const { bg, text } = resolveCellColor(users, enabledUsers, statusMatrix, row.iden, iden)
                      // 构造点号分隔的 problemIden（用于 record create API）
                      const dotIden = `${row.iden}/${iden}`.replaceAll("/", ".")
                      const ds = getDifficultyStyle(problem)
                      const rating = getRatingFromProblem(problem)

                      return (
                        <td
                          key={iden}
                          className={`border-r border-b px-0.5 py-0.5 text-center transition-colors w-14 max-w-14 overflow-hidden ${bg}`}
                          onContextMenu={isLoggedIn && onOverrideStatus
                            ? (e) => handleContextMenu(e, dotIden, problem.name)
                            : undefined
                          }
                        >
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Link
                                href={`/problem/${row.iden}/${iden}`}
                                className={`block hover:opacity-80 ${text}`}
                                title={problem.name}
                              >
                                <span className="text-xs font-semibold">{iden}</span>
                                <span className="block text-[10px] truncate leading-tight opacity-70">{problem.name}</span>
                                {rating !== null && (
                                  <span className="block text-[10px] font-medium leading-tight" style={{ color: ds?.color }}>{rating}</span>
                                )}
                              </Link>
                            </TooltipTrigger>
                            <TooltipContent>
                              <p className="font-medium mb-1">{problem.name}</p>
                              {rating !== null && (
                                <p className="text-xs mb-1" style={{ color: ds?.color ?? RATING_COLOR_MAP[getRatingColor(rating)] }}>
                                  Difficulty: {rating}
                                </p>
                              )}
                              {users.map((u, idx) => {
                                const uK = userKey(u)
                                const status = getCellStatus(statusMatrix, uK, row.iden, iden)
                                const c = USER_BG_COLORS[idx % USER_BG_COLORS.length]
                                const enabled = enabledUsers.has(uK)
                                return (
                                  <div key={uK} className={`flex items-center gap-1.5 text-xs ${enabled ? "" : "opacity-40"}`}>
                                    <div className={`w-2 h-2 rounded-full ${c.dot}`} />
                                    <span>{userDisplayName(u)}:</span>
                                    <span>{status?.passed ? "✅" : status ? "❌" : "—"}</span>
                                  </div>
                                )
                              })}
                            </TooltipContent>
                          </Tooltip>
                        </td>
                      )
                    })}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>

        {/* 右键浮层菜单 — 搜索提示框风格 */}
        {contextMenu && (
          <Card
            ref={contextMenuRef}
            className="fixed z-50 p-0 w-52 bg-background/80 shadow-lg backdrop-blur-md border-none rounded-lg"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <CardContent className="p-1">
              <div className="px-2.5 py-1.5 text-[11px] text-muted-foreground font-medium truncate">
                {contextMenu.problemName}
              </div>
              <div className="flex flex-col">
                <button
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-primary/5 hover:text-primary cursor-pointer text-left"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onOverrideStatus?.(contextMenu.dotIden, true)
                    setContextMenu(null)
                  }}
                >
                  <CheckCircle2 className="size-3.5 text-green-500" />
                  <span className="font-medium text-foreground">标记为已通过</span>
                </button>
                <button
                  className="flex items-center gap-2 rounded-md px-2.5 py-1.5 text-xs transition-colors hover:bg-primary/5 hover:text-primary cursor-pointer text-left"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    onOverrideStatus?.(contextMenu.dotIden, false)
                    setContextMenu(null)
                  }}
                >
                  <XCircle className="size-3.5 text-red-500" />
                  <span className="font-medium text-foreground">标记为未通过</span>
                </button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </TooltipProvider>
  )
}
