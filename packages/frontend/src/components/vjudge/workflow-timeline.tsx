"use client"

import { cn } from "@/lib/utils"
import {
  CircleDot,
  ArrowUpCircle,
  UserCheck,
  FileSearch,
  FileCheck,
  Send,
  Scale,
  CheckCircle2,
  XCircle,
  Loader2,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import { useState } from "react"
import { Badge } from "@/components/ui/badge"

// ==================== 类型定义 ====================

export interface WorkflowTimelineEvent {
  /** 状态类型 */
  status_type: string
  /** 时间戳 (ISO string) */
  timestamp: string
  /** 是否是最终状态 */
  is_final?: boolean
  /** 是否成功 */
  success?: boolean
  /** 错误信息 */
  error?: string | null
  /** 工作流状态值 */
  values?: Record<string, unknown>
}

// ==================== 状态配置 ====================

interface StatusConfig {
  label: string
  labelCn: string
  icon: React.ElementType
  color: string
  bgColor: string
  borderColor: string
  dotColor: string
}

const STATUS_CONFIG: Record<string, StatusConfig> = {
  Initial: {
    label: "Initial",
    labelCn: "初始化",
    icon: CircleDot,
    color: "text-gray-500",
    bgColor: "bg-gray-50",
    borderColor: "border-gray-200",
    dotColor: "bg-gray-400",
  },
  Dispatching: {
    label: "Dispatching",
    labelCn: "调度中",
    icon: ArrowUpCircle,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    dotColor: "bg-blue-500",
  },
  AccountVerified: {
    label: "Account Verified",
    labelCn: "账号已验证",
    icon: UserCheck,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    dotColor: "bg-green-500",
  },
  ProblemFetched: {
    label: "Problem Fetched",
    labelCn: "题目已获取",
    icon: FileSearch,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    dotColor: "bg-yellow-500",
  },
  ProblemSynced: {
    label: "Problem Synced",
    labelCn: "题目已同步",
    icon: FileCheck,
    color: "text-green-600",
    bgColor: "bg-green-50",
    borderColor: "border-green-200",
    dotColor: "bg-green-500",
  },
  SubmissionCreated: {
    label: "Submission Created",
    labelCn: "提交已创建",
    icon: Send,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    dotColor: "bg-blue-500",
  },
  SubmissionJudged: {
    label: "Submission Judged",
    labelCn: "评测完成",
    icon: Scale,
    color: "text-yellow-600",
    bgColor: "bg-yellow-50",
    borderColor: "border-yellow-200",
    dotColor: "bg-yellow-500",
  },
  Completed: {
    label: "Completed",
    labelCn: "完成",
    icon: CheckCircle2,
    color: "text-purple-600",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    dotColor: "bg-purple-500",
  },
  Error: {
    label: "Error",
    labelCn: "错误",
    icon: XCircle,
    color: "text-red-600",
    bgColor: "bg-red-50",
    borderColor: "border-red-200",
    dotColor: "bg-red-500",
  },
}

const DEFAULT_STATUS_CONFIG: StatusConfig = {
  label: "Unknown",
  labelCn: "未知",
  icon: CircleDot,
  color: "text-gray-400",
  bgColor: "bg-gray-50",
  borderColor: "border-gray-200",
  dotColor: "bg-gray-300",
}

function getStatusConfig(statusType: string): StatusConfig {
  return STATUS_CONFIG[statusType] ?? DEFAULT_STATUS_CONFIG
}

// ==================== 时间工具 ====================

function formatRelativeTime(timestamp: string): string {
  const date = new Date(timestamp)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffSeconds = Math.floor(diffMs / 1000)

  if (diffSeconds < 5) return "刚刚"
  if (diffSeconds < 60) return `${diffSeconds} 秒前`
  const diffMinutes = Math.floor(diffSeconds / 60)
  if (diffMinutes < 60) return `${diffMinutes} 分钟前`
  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} 小时前`
  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 30) return `${diffDays} 天前`
  return date.toLocaleDateString("zh-CN")
}

function formatAbsoluteTime(timestamp: string): string {
  return new Date(timestamp).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })
}

// ==================== 值展开面板 ====================

function ValuesPanel({ values }: { values: Record<string, unknown> }) {
  const entries = Object.entries(values).filter(
    ([key]) => key !== "statusType" && key !== "status_type"
  )
  if (entries.length === 0) return null

  return (
    <div className="mt-2 rounded-md border bg-muted/50 p-2 text-xs">
      <table className="w-full">
        <tbody>
          {entries.map(([key, val]) => (
            <tr key={key} className="border-b border-muted last:border-0">
              <td className="py-1 pr-3 font-mono text-muted-foreground">{key}</td>
              <td className="py-1 font-mono break-all">
                {typeof val === "object" ? JSON.stringify(val) : String(val)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// ==================== 单个时间线节点 ====================

function TimelineNode({
  event,
  isLast,
  isLoading,
}: {
  event: WorkflowTimelineEvent
  isLast: boolean
  isLoading?: boolean
}) {
  const [expanded, setExpanded] = useState(false)
  const config = getStatusConfig(event.status_type)
  const Icon = config.icon
  const hasValues = event.values && Object.keys(event.values).length > 0

  return (
    <div className="relative flex gap-3">
      {/* 垂直线 */}
      {!isLast && (
        <div className="absolute left-[15px] top-[32px] h-[calc(100%-16px)] w-[2px] bg-border" />
      )}

      {/* 图标 */}
      <div
        className={cn(
          "relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border-2 bg-background",
          config.borderColor
        )}
      >
        {isLast && isLoading ? (
          <Loader2 className={cn("h-4 w-4 animate-spin", config.color)} />
        ) : (
          <Icon className={cn("h-4 w-4", config.color)} />
        )}
      </div>

      {/* 内容 */}
      <div className="flex-1 pb-6">
        <div className="flex items-center gap-2">
          <span className={cn("font-medium text-sm", config.color)}>
            {config.labelCn}
          </span>
          <Badge variant="outline" className={cn("text-[10px] px-1.5 py-0", config.color)}>
            {config.label}
          </Badge>
          {event.is_final && event.success && (
            <Badge className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0">
              成功
            </Badge>
          )}
          {event.is_final && event.success === false && (
            <Badge className="bg-red-100 text-red-700 text-[10px] px-1.5 py-0">
              失败
            </Badge>
          )}
        </div>

        {/* 时间戳 */}
        <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground" title={formatAbsoluteTime(event.timestamp)}>
          {formatRelativeTime(event.timestamp)}
        </div>

        {/* 错误信息 */}
        {event.error && (
          <div className="mt-2 rounded-md border border-red-200 bg-red-50 p-2 text-xs text-red-700">
            {event.error}
          </div>
        )}

        {/* 值详情 (可展开) */}
        {hasValues && (
          <div className="mt-1">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              详情
            </button>
            {expanded && <ValuesPanel values={event.values!} />}
          </div>
        )}
      </div>
    </div>
  )
}

// ==================== 主组件 ====================

export interface WorkflowTimelineProps {
  /** 时间线事件列表（按时间顺序） */
  events: WorkflowTimelineEvent[]
  /** 是否正在加载中（最后一个节点显示 loading 动画） */
  isLoading?: boolean
  /** 自定义 className */
  className?: string
}

/**
 * WorkflowTimeline - 工作流状态时间线组件
 *
 * 基于 shadcn/ui 风格的垂直时间线，展示工作流状态流转过程。
 * 每个节点对应一个 VjudgeStatusType，带有图标、颜色、时间戳、可展开详情。
 * 支持实时追加新节点。
 */
export function WorkflowTimeline({
  events,
  isLoading = false,
  className,
}: WorkflowTimelineProps) {
  if (events.length === 0) {
    return (
      <div className={cn("text-sm text-muted-foreground py-4 text-center", className)}>
        暂无工作流状态数据
      </div>
    )
  }

  return (
    <div className={cn("relative", className)}>
      {events.map((event, index) => (
        <TimelineNode
          key={`${event.status_type}-${event.timestamp}-${index}`}
          event={event}
          isLast={index === events.length - 1}
          isLoading={isLoading && index === events.length - 1}
        />
      ))}
    </div>
  )
}

// ==================== 导出配置 (供其他组件使用) ====================

export { getStatusConfig, STATUS_CONFIG, formatRelativeTime, formatAbsoluteTime }
export type { StatusConfig }
