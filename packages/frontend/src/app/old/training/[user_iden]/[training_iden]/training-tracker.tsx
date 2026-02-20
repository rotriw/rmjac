"use client"

import * as React from "react"
import Link from "next/link"
import { TrainingProblem, TrainingList } from "@rmjac/api-declare"
import { TitleCard } from "@/components/card/card"

interface TrackerItem {
  key: string
  iden: string
  nodeId: number
  accepted: boolean
}

interface TrackerRow {
  key: string
  title: string
  items: TrackerItem[]
}

interface TrainingTrackerProps {
  problems: TrainingProblem[]
  trainingName: string
  statusMap: Map<number, string>
}

function extractTrackerRows(
  problems: TrainingProblem[],
  statusMap: Map<number, string>,
  parentTitle: string = "根目录"
): TrackerRow[] {
  const rows: TrackerRow[] = []
  const currentRowItems: TrackerItem[] = []

  for (const problem of problems) {
    if ("ProblemIden" in problem) {
      const raw = problem.ProblemIden as unknown as [unknown, unknown, unknown, unknown?]
      const [edgeId, problemInfo, problemNodeId] = raw
      const edgeIdNum = typeof edgeId === "bigint" ? Number(edgeId) : Number(edgeId)
      const nodeIdNum = typeof problemNodeId === "bigint" ? Number(problemNodeId) : Number(problemNodeId)
      const status = statusMap.get(nodeIdNum)
      const iden = typeof problemInfo === "string" ? problemInfo : String(nodeIdNum)
      currentRowItems.push({
        key: `problem-${edgeIdNum}`,
        iden,
        nodeId: nodeIdNum,
        accepted: status === "Accepted",
      })
    } else if ("ProblemTraining" in problem) {
      const trainingList = problem.ProblemTraining[1] as TrainingList
      const subRows = extractTrackerRows(trainingList.own_problem, statusMap, trainingList.description || "子模块")
      rows.push(...subRows)
    }
  }

  // 如果当前层有直接的题目，创建一行
  if (currentRowItems.length > 0) {
    rows.unshift({
      key: `row-${parentTitle}-${Date.now()}`,
      title: parentTitle,
      items: currentRowItems,
    })
  }

  return rows
}

// 生成列标题（A, B, C, ..., Z, AA, AB, ...）
function getColumnLabel(index: number): string {
  let label = ""
  let num = index
  while (num >= 0) {
    label = String.fromCharCode(65 + (num % 26)) + label
    num = Math.floor(num / 26) - 1
  }
  return label
}

export default function TrainingTracker({ problems, statusMap, trainingName }: TrainingTrackerProps) {
  const rows = React.useMemo(() => extractTrackerRows(problems, statusMap), [problems, statusMap])

  if (rows.length === 0) {
    return <div className="text-center py-8 text-gray-500">暂无题目</div>
  }

  // 计算最大列数
  const maxColumns = Math.max(...rows.map(row => row.items.length))

  // 计算统计信息
  const totalProblems = rows.reduce((acc, row) => acc + row.items.length, 0)
  const acceptedProblems = rows.reduce(
    (acc, row) => acc + row.items.filter(item => item.accepted).length,
    0
  )

  return (
    <div className="space-y-4">
        <TitleCard
        
              title={trainingName}
              description={``}
        />
      {/* 统计信息 */}
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-green-500"></div>
          <span>已通过</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-sm bg-gray-100 border border-gray-300"></div>
          <span>未通过</span>
        </div>
        <div className="ml-auto font-medium">
          进度: {acceptedProblems} / {totalProblems}
        </div>
      </div>

      {/* AtCoder Problems 风格的大表格 */}
      <div className="overflow-x-auto border rounded-lg">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-muted/50">
              <th className="border-r border-b px-3 py-2 text-left font-medium text-sm sticky left-0 bg-muted/50 z-10 min-w-[140px]">
                模块
              </th>
              {Array.from({ length: maxColumns }, (_, i) => (
                <th
                  key={i}
                  className="border-r border-b px-2 py-2 text-center font-medium text-sm min-w-[80px]"
                >
                  {getColumnLabel(i)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className={`hover:bg-muted/30`}>
                {/* 模块名称 */}
                <td className={`border-r border-b px-3 py-2 font-medium text-sm sticky left-0 bg-background z-10   ${row.items.length == (row.items.filter(i => i.accepted).length) && "bg-green-100"}`}>
                  <div className={"flex items-center justify-between gap-2"}>
                    <span className={`truncate`} title={row.title}>
                      {row.title}
                    </span>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">
                      {row.items.filter(i => i.accepted).length}/{row.items.length}
                    </span>
                  </div>
                </td>
                {/* 题目格子 */}
                {Array.from({ length: maxColumns }, (_, i) => {
                  const item = row.items[i]
                  if (!item) {
                    return (
                      <td
                        key={i}
                        className="border-r border-b px-2 py-2"
                      >
                        {/* 空格子 */}
                      </td>
                    )
                  }
                  return (
                    <td
                      key={item.key}
                      className={`border-r border-b px-2 py-2 text-center transition-colors ${
                        item.accepted
                          ? "bg-green-100 hover:bg-green-200"
                          : "bg-gray-50 hover:bg-gray-100"
                      }`}
                    >
                      <Link
                        href={`/problem/${item.iden}`}
                        className={`block text-xs font-medium truncate ${
                          item.accepted
                            ? "text-green-700 hover:text-green-900"
                            : "text-gray-600 hover:text-gray-800"
                        }`}
                        title={`${item.iden}${item.accepted ? " (已通过)" : ""}`}
                      >
                        {item.iden}
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
