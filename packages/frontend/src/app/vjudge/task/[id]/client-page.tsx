"use client"

import { useState, useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import { getTaskStatus, WorkflowTaskStatusDTO } from "@/api/server/api_vjudge_workflow"
import { useWorkflowStatus } from "@/hooks/use-workflow-status"
import {
  WorkflowTimeline,
  type WorkflowTimelineEvent,
  formatRelativeTime,
  formatAbsoluteTime,
} from "@/components/vjudge/workflow-timeline"
import {
  Loader2,
  AlertCircle,
  ArrowLeft,
  Clock,
  CalendarClock,
  CheckCircle2,
  XCircle,
  Circle,
  ArrowUpCircle,
  RefreshCw,
  ChevronDown,
  Terminal,
  RotateCcw,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { cn } from "@/lib/utils"

// ==================== 状态配置 ====================

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  pending: {
    label: "已创建",
    color: "text-gray-600",
    bgColor: "bg-gray-100 border-gray-200",
    icon: Circle,
  },
  dispatching: {
    label: "调度中",
    color: "text-blue-600",
    bgColor: "bg-blue-100 border-blue-200",
    icon: ArrowUpCircle,
  },
  running: {
    label: "运行中",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 border-yellow-200",
    icon: Loader2,
  },
  waiting: {
    label: "等待中",
    color: "text-yellow-600",
    bgColor: "bg-yellow-100 border-yellow-200",
    icon: Clock,
  },
  completed: {
    label: "已完成",
    color: "text-purple-600",
    bgColor: "bg-purple-100 border-purple-200",
    icon: CheckCircle2,
  },
  failed: {
    label: "失败",
    color: "text-red-600",
    bgColor: "bg-red-100 border-red-200",
    icon: XCircle,
  },
  cron_online: {
    label: "定时运行中",
    color: "text-emerald-600",
    bgColor: "bg-emerald-100 border-emerald-200",
    icon: RefreshCw,
  },
  cron_error: {
    label: "定时出错",
    color: "text-red-600",
    bgColor: "bg-red-100 border-red-200",
    icon: AlertCircle,
  },
}

function getStatus(status: string) {
  return (
    STATUS_CONFIG[status] ?? {
      label: status,
      color: "text-gray-500",
      bgColor: "bg-gray-100 border-gray-200",
      icon: Circle,
    }
  )
}

// ==================== 解析 workflow_snapshot 为时间线事件 ====================

function parseSnapshotEvents(
  snapshotJson: string | null | undefined
): WorkflowTimelineEvent[] {
  if (!snapshotJson) return []
  try {
    const snapshot = JSON.parse(snapshotJson)
    // snapshot 格式: { statuses: [ { status_type, timestamp, is_final, success, error, values } ] }
    if (Array.isArray(snapshot.statuses)) {
      return snapshot.statuses as WorkflowTimelineEvent[]
    }
    // 或者直接是数组
    if (Array.isArray(snapshot)) {
      return snapshot as WorkflowTimelineEvent[]
    }
    return []
  } catch {
    return []
  }
}

// ==================== 主组件 ====================

export function TicketDetailContent({ taskId }: { taskId: string }) {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [taskStatus, setTaskStatus] = useState<WorkflowTaskStatusDTO | null>(
    null
  )
  const [logOpen, setLogOpen] = useState(false)

  // Socket.IO 实时更新
  const {
    statusHistory: liveHistory,
    isCompleted: liveCompleted,
    latestStatus,
  } = useWorkflowStatus({ taskId })

  // 加载任务状态
  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      setError("")
      try {
        const resp = await getTaskStatus({ task_id: taskId })
        // resp 可能是 { data: WorkflowTaskStatusDTO } 或直接是 WorkflowTaskStatusDTO
        const data = (resp as unknown as Record<string, unknown>).data ?? resp
        setTaskStatus(data as WorkflowTaskStatusDTO)
      } catch (err) {
        console.error(err)
        setError("加载任务详情失败")
      } finally {
        setLoading(false)
      }
    }
    fetch()
  }, [taskId])

  // 构建时间线事件: snapshot (历史) + live (实时)
  const timelineEvents = useMemo<WorkflowTimelineEvent[]>(() => {
    const snapshotEvents = parseSnapshotEvents(
      taskStatus?.workflow_status
        ? JSON.stringify(taskStatus.workflow_status)
        : null
    )

    // 将实时事件合并（去重 by status_type + timestamp）
    const seen = new Set(
      snapshotEvents.map((e) => `${e.status_type}:${e.timestamp}`)
    )
    const merged = [...snapshotEvents]
    for (const live of liveHistory) {
      const key = `${live.status_type}:${live.timestamp}`
      if (!seen.has(key)) {
        merged.push({
          status_type: live.status_type,
          timestamp: live.timestamp,
          is_final: live.is_final,
          success: live.success,
          error: live.error ?? undefined,
          values: live.output as Record<string, unknown> | undefined,
        })
        seen.add(key)
      }
    }
    return merged
  }, [taskStatus, liveHistory])

  // 确定当前状态 (优先实时)
  const currentStatus =
    latestStatus?.status_type ??
    taskStatus?.db_status ??
    "pending"
  const isRunning =
    !liveCompleted &&
    ["pending", "dispatching", "running", "waiting"].includes(currentStatus)
  const statusCfg = getStatus(currentStatus)
  const StatusIcon = statusCfg.icon

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">加载工单详情...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6 space-y-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/vjudge/task")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          返回列表
        </Button>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      {/* 顶部导航 */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/vjudge/task")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        返回列表
      </Button>

      {/* 标题区 */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold">
              工单 #{taskId}
            </h1>
            <Badge
              variant="outline"
              className={cn("text-xs px-2 py-0.5", statusCfg.bgColor, statusCfg.color)}
            >
              <StatusIcon
                className={cn(
                  "h-3 w-3 mr-1",
                  statusCfg.icon === Loader2 && "animate-spin"
                )}
              />
              {statusCfg.label}
            </Badge>
          </div>
          {taskStatus && (
            <p className="text-sm text-muted-foreground mt-1">
              创建于 {formatAbsoluteTime(taskStatus.created_at)} ·
              更新于 {formatRelativeTime(taskStatus.updated_at)}
            </p>
          )}
        </div>
      </div>

      {/* 两栏布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_300px] gap-6">
        {/* 左栏: 时间线 */}
        <div className="space-y-4">
          {/* 工作流时间线 */}
          <div className="border rounded-lg p-4">
            <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
              <CalendarClock className="h-4 w-4 text-muted-foreground" />
              工作流时间线
            </h3>
            {timelineEvents.length > 0 ? (
              <WorkflowTimeline
                events={timelineEvents}
                isLoading={isRunning}
              />
            ) : (
              <div className="text-sm text-muted-foreground py-8 text-center">
                {isRunning
                  ? "等待工作流状态推送..."
                  : "暂无工作流状态数据"}
              </div>
            )}
          </div>

          {/* 原始日志 (可折叠) */}
          {taskStatus?.log && (
            <Collapsible open={logOpen} onOpenChange={setLogOpen}>
              <div className="border rounded-lg">
                <CollapsibleTrigger asChild>
                  <button className="flex items-center gap-2 w-full p-4 text-left hover:bg-muted/50 transition-colors">
                    <Terminal className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-semibold">原始日志</span>
                    <ChevronDown
                      className={cn(
                        "h-4 w-4 ml-auto text-muted-foreground transition-transform",
                        logOpen && "rotate-180"
                      )}
                    />
                  </button>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <div className="px-4 pb-4">
                    <pre className="bg-muted/50 rounded-md p-3 text-xs font-mono overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap break-all">
                      {taskStatus.log}
                    </pre>
                  </div>
                </CollapsibleContent>
              </div>
            </Collapsible>
          )}
        </div>

        {/* 右栏: 元数据 */}
        <div className="space-y-4">
          {/* 状态卡片 */}
          <div className="border rounded-lg p-4 space-y-3">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              详细信息
            </h3>

            {/* 状态 */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">状态</div>
              <Badge
                variant="outline"
                className={cn(
                  "text-xs px-2 py-0.5",
                  statusCfg.bgColor,
                  statusCfg.color
                )}
              >
                <StatusIcon
                  className={cn(
                    "h-3 w-3 mr-1",
                    statusCfg.icon === Loader2 && "animate-spin"
                  )}
                />
                {statusCfg.label}
              </Badge>
            </div>

            {/* 任务 ID */}
            <div className="space-y-1">
              <div className="text-xs text-muted-foreground">任务 ID</div>
              <code className="text-xs font-mono bg-muted px-2 py-0.5 rounded">
                {taskId}
              </code>
            </div>

            {/* 创建时间 */}
            {taskStatus && (
              <>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">创建时间</div>
                  <div className="text-xs">
                    {formatAbsoluteTime(taskStatus.created_at)}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="text-xs text-muted-foreground">
                    最后更新
                  </div>
                  <div className="text-xs">
                    {formatAbsoluteTime(taskStatus.updated_at)}
                  </div>
                </div>
              </>
            )}

            {/* 实时 WebSocket 状态 */}
            {latestStatus && (
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">
                  实时状态
                </div>
                <div className="text-xs flex items-center gap-1">
                  {isRunning && (
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                    </span>
                  )}
                  {latestStatus.status_type}
                </div>
              </div>
            )}
          </div>

          {/* 操作 */}
          <div className="border rounded-lg p-4 space-y-2">
            <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              操作
            </h3>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start"
              onClick={() => {
                setLoading(true)
                getTaskStatus({ task_id: taskId })
                  .then((resp) => {
                    const data = (resp as unknown as Record<string, unknown>).data ?? resp
                    setTaskStatus(data as WorkflowTaskStatusDTO)
                  })
                  .catch(console.error)
                  .finally(() => setLoading(false))
              }}
            >
              <RotateCcw className="h-3.5 w-3.5 mr-2" />
              刷新状态
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
