"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { useWorkflowStatus } from "@/hooks/use-workflow-status"
import { getTaskStatus } from "@/api/server/api_vjudge_workflow"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { StandardCard, TitleCard } from "@/components/card/card"
import { WorkflowTimeline, WorkflowTimelineEvent } from "@/components/vjudge/workflow-timeline"
import {
  ArrowLeft,
  CheckCircle2,
  Loader2,
  RotateCcw,
  XCircle,
} from "lucide-react"
import type { WorkflowTaskStatusDTO } from "@rmjac/api-declare"
import { formatAbsoluteTime, formatRelativeTime } from "@/components/vjudge/workflow-timeline"

interface TaskDetailClientProps {
  taskId: string
}

const WORKFLOW_PROGRESS_ORDER = [
  "Initial",
  "Dispatching",
  "AccountVerified",
  "ProblemFetched",
  "ProblemSynced",
  "SubmissionCreated",
  "SubmissionJudged",
  "Completed",
]

const WORKFLOW_PROGRESS_FALLBACK: Record<string, number> = {
  pending: 5,
  dispatching: 15,
  running: 50,
  waiting: 40,
  success: 100,
  completed: 100,
  failed: 100,
}

const STATUS_LABELS: Record<
  string,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  pending: { label: "等待", color: "text-muted-foreground", bgColor: "bg-muted", icon: Loader2 },
  dispatching: { label: "调度中", color: "text-blue-600", bgColor: "bg-blue-50", icon: Loader2 },
  running: { label: "执行中", color: "text-blue-600", bgColor: "bg-blue-50", icon: Loader2 },
  waiting: { label: "等待中", color: "text-yellow-600", bgColor: "bg-yellow-50", icon: Loader2 },
  success: { label: "完成", color: "text-green-600", bgColor: "bg-green-50", icon: CheckCircle2 },
  completed: { label: "完成", color: "text-green-600", bgColor: "bg-green-50", icon: CheckCircle2 },
  failed: { label: "失败", color: "text-red-600", bgColor: "bg-red-50", icon: XCircle },
}

interface WorkflowLogMessage {
  final_service: string
  now_value: Record<string, string>
  history_step: Array<{
    service_name: string
    output_value: Record<string, string>
  }>
}

function parseSnapshotEvents(snapshot: unknown): WorkflowTimelineEvent[] {
  if (!snapshot) return []
  if (Array.isArray(snapshot)) {
    return snapshot as WorkflowTimelineEvent[]
  }
  if (typeof snapshot === "string") {
    try {
      const parsed = JSON.parse(snapshot)
      return parseSnapshotEvents(parsed)
    } catch {
      return []
    }
  }
  if (typeof snapshot === "object" && snapshot !== null) {
    const data = snapshot as { statuses?: unknown }
    if (Array.isArray(data.statuses)) {
      return data.statuses as WorkflowTimelineEvent[]
    }
  }
  return []
}

function parseWorkflowLogEvents(
  log: string | null | undefined,
  baseTime?: string
): WorkflowTimelineEvent[] {
  if (!log) return []
  try {
    const message = JSON.parse(log) as WorkflowLogMessage
    if (!Array.isArray(message.history_step)) return []

    // 日志中无真实时间戳，使用创建/更新时间作为基准，按步骤递增 1s 保序展示
    const base = baseTime ? new Date(baseTime).getTime() : Date.now()
    const events: WorkflowTimelineEvent[] = []

    if (message.now_value && Object.keys(message.now_value).length > 0) {
      events.push({
        status_type: "Initial",
        timestamp: new Date(base).toISOString(),
        values: message.now_value,
      })
    }

    message.history_step.forEach((step, index) => {
      events.push({
        status_type: step.service_name || "Service",
        timestamp: new Date(base + (index + 1) * 1000).toISOString(),
        values: {
          service_name: step.service_name,
          ...step.output_value,
        },
      })
    })

    return events
  } catch {
    return []
  }
}

function getWorkflowProgress(events: WorkflowTimelineEvent[], currentStatus?: string) {
  const indexMap = new Map(
    WORKFLOW_PROGRESS_ORDER.map((status, index) => [status, index])
  )
  let maxIndex = -1

  for (const event of events) {
    const idx = indexMap.get(event.status_type)
    if (idx !== undefined) {
      maxIndex = Math.max(maxIndex, idx)
    }
  }

  if (maxIndex === -1 && currentStatus) {
    const idx = indexMap.get(currentStatus)
    if (idx !== undefined) {
      maxIndex = idx
    }
  }

  if (maxIndex >= 0) {
    const percent = Math.round(
      ((maxIndex + 1) / WORKFLOW_PROGRESS_ORDER.length) * 100
    )
    return {
      percent,
      label: `第 ${maxIndex + 1}/${WORKFLOW_PROGRESS_ORDER.length} 步`,
    }
  }

  const fallback = currentStatus ? WORKFLOW_PROGRESS_FALLBACK[currentStatus] : undefined
  if (typeof fallback === "number") {
    return { percent: fallback, label: "按状态估算" }
  }

  return { percent: 0, label: "等待工作流启动" }
}

export function TaskDetailClient({ taskId }: TaskDetailClientProps) {
  const router = useRouter()
  const [taskStatus, setTaskStatus] = useState<WorkflowTaskStatusDTO | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const {
    statusHistory: liveHistory,
    isCompleted: liveCompleted,
    latestStatus,
  } = useWorkflowStatus({ taskId })

  useEffect(() => {
    const fetch = async () => {
      setLoading(true)
      setError("")
      try {
        const resp = await getTaskStatus({ task_id: Number(taskId) })
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

  const timelineEvents = useMemo<WorkflowTimelineEvent[]>(() => {
    const snapshotEvents = parseSnapshotEvents(taskStatus?.workflow_status)
    const logEvents = parseWorkflowLogEvents(
      taskStatus?.log,
      taskStatus?.created_at
    )

    // workflow_snapshot 已按后端规范结构化，优先使用；旧日志仅作为兜底
    const merged = snapshotEvents.length > 0 ? [...snapshotEvents] : [...logEvents]
    // 将实时事件合并（去重 by status_type + timestamp）
    const seen = new Set(merged.map((e) => `${e.status_type}:${e.timestamp}`))
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

    // 统一按时间排序，避免实时补发导致的乱序
    return merged.sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    )
  }, [taskStatus, liveHistory])

  const currentStatus =
    latestStatus?.status_type ??
    taskStatus?.db_status ??
    "pending"

  const workflowProgress = useMemo(
    () => getWorkflowProgress(timelineEvents, currentStatus),
    [timelineEvents, currentStatus]
  )

  const statusCfg = STATUS_LABELS[currentStatus] ?? {
    label: currentStatus,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
    icon: Loader2,
  }
  const StatusIcon = statusCfg.icon
  const isRunning =
    !liveCompleted &&
    ["pending", "dispatching", "running", "waiting"].includes(currentStatus)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push("/vjudge/task")}
        >
          <ArrowLeft className="mr-1 h-4 w-4" />
          返回列表
        </Button>
        <Button asChild variant="ghost" size="sm">
          <Link href="/vjudge/task/new">创建同步任务</Link>
        </Button>
      </div>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <TitleCard
          title={`工单 #${taskId}`}
          description="查看工作流执行详情和日志快照。"
        />
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
        <div className="text-sm text-muted-foreground">
          创建于 {formatAbsoluteTime(taskStatus.created_at)} · 更新于 {formatRelativeTime(taskStatus.updated_at)}
        </div>
      )}

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      <StandardCard title="工作流进度">
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-muted-foreground">{workflowProgress.label}</span>
            <span className="font-semibold text-primary">
              {workflowProgress.percent}%
            </span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${workflowProgress.percent}%` }}
            />
          </div>
        </div>
      </StandardCard>

      <StandardCard title="工作流时间线">
        {timelineEvents.length > 0 ? (
          <WorkflowTimeline events={timelineEvents} isLoading={isRunning} />
        ) : (
          <div className="text-sm text-muted-foreground py-8 text-center">
            {isRunning ? "等待工作流状态推送..." : "暂无工作流状态数据"}
          </div>
        )}
      </StandardCard>

      <StandardCard title="日志快照">
        {taskStatus?.log ? (
          <pre className="bg-muted/50 rounded-md p-3 text-xs font-mono overflow-x-auto max-h-80 overflow-y-auto whitespace-pre-wrap break-all">
            {taskStatus.log}
          </pre>
        ) : (
          <div className="text-sm text-muted-foreground">暂无日志</div>
        )}
      </StandardCard>

      <StandardCard title="操作">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start"
          onClick={() => {
            setLoading(true)
            getTaskStatus({ task_id: Number(taskId) })
              .then((resp) => {
                const data = (resp as unknown as Record<string, unknown>).data ?? resp
                setTaskStatus(data as WorkflowTaskStatusDTO)
              })
              .catch(console.error)
              .finally(() => setLoading(false))
          }}
          disabled={loading}
        >
          {loading ? (
            <Loader2 className="h-3.5 w-3.5 mr-2 animate-spin" />
          ) : (
            <RotateCcw className="h-3.5 w-3.5 mr-2" />
          )}
          刷新状态
        </Button>
      </StandardCard>
    </div>
  )
}
