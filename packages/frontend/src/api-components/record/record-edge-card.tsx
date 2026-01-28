"use client"

import Link from "next/link"
import { RecordEdge } from "@rmjac/api-declare"
import { RecordStatusBadge } from "./record-status-badge"
import { Clock, Code, FileCode, Award } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * RecordEdgeCard - 提交记录边展示组件
 * 
 * 用于展示提交记录的详细信息，支持紧凑模式和完整卡片模式
 * 
 * @example
 * // 完整卡片模式，显示题目和用户信息
 * <RecordEdgeCard
 *   edge={recordEdge}
 *   problemIden="P1001"
 *   problemName="A+B Problem"
 *   userIden="user123"
 *   userName="张三"
 *   showProblem
 *   showUser
 * />
 * 
 * @example
 * // 紧凑模式，只显示基本信息
 * <RecordEdgeCard
 *   edge={recordEdge}
 *   compact
 * />
 */

interface RecordEdgeCardProps {
  edge: RecordEdge
  problemIden?: string
  problemName?: string
  userIden?: string
  userName?: string
  showUser?: boolean
  showProblem?: boolean
  className?: string
  compact?: boolean
}

export function RecordEdgeCard({
  edge,
  problemIden,
  problemName,
  userIden,
  userName,
  showUser = false,
  showProblem = false,
  className,
  compact = false,
}: RecordEdgeCardProps) {
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const formatCodeLength = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    return `${(bytes / 1024).toFixed(1)} KB`
  }

  if (compact) {
    return (
      <div
        className={cn(
          "flex items-center justify-between py-2 px-3 border-b hover:bg-gray-50/50 transition-colors",
          className
        )}
      >
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <RecordStatusBadge status={edge.record_status} />
          
          {showProblem && problemIden && (
            <Link
              href={`/problem/${problemIden}`}
              className="text-sm font-medium text-blue-600 hover:underline truncate"
            >
              {problemName || problemIden}
            </Link>
          )}
          
          {showUser && userIden && (
            <Link
              href={`/user/${userIden}`}
              className="text-sm text-gray-700 hover:text-blue-600 hover:underline truncate"
            >
              {userName || userIden}
            </Link>
          )}
        </div>

        <div className="flex items-center gap-3 text-xs text-gray-500 shrink-0">
          <div className="flex items-center gap-1">
            <Award className="w-3.5 h-3.5" />
            <span className="font-medium">{edge.score}</span>
          </div>
          {edge.platform && (
            <div className="flex items-center gap-1">
              <Code className="w-3.5 h-3.5" />
              <span>{edge.platform}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" />
            <span>{formatDate(edge.submit_time)}</span>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "border rounded-lg hover:bg-gray-50/50 transition-colors",
        className
      )}
    >
      <div className="flex items-start justify-between p-4 gap-4">
        <div className="flex flex-col gap-2 flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <RecordStatusBadge status={edge.record_status} showIcon />
            
            {showProblem && problemIden && (
              <Link
                href={`/problem/${problemIden}`}
                className="font-medium text-blue-600 hover:underline truncate"
              >
                {problemName || problemIden}
              </Link>
            )}
            
            {showUser && userIden && (
              <Link
                href={`/user/${userIden}`}
                className="text-sm text-gray-600 hover:text-blue-600 hover:underline truncate"
              >
                {userName || userIden}
              </Link>
            )}
          </div>

          <div className="flex items-center gap-4 text-sm text-gray-600">
            <div className="flex items-center gap-1.5">
              <Award className="w-4 h-4 text-yellow-600" />
              <span className="font-semibold">{edge.score}</span>
              <span className="text-xs text-gray-500">分</span>
            </div>

            {edge.code_length > 0 && (
              <div className="flex items-center gap-1.5">
                <FileCode className="w-4 h-4" />
                <span>{formatCodeLength(edge.code_length)}</span>
              </div>
            )}

            {edge.platform && (
              <div className="flex items-center gap-1.5">
                <Code className="w-4 h-4" />
                <span>{edge.platform}</span>
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 text-sm text-gray-500 shrink-0">
          <Clock className="w-4 h-4" />
          <span>{formatDate(edge.submit_time)}</span>
        </div>
      </div>
    </div>
  )
}
