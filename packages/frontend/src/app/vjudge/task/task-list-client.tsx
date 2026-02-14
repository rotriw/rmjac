"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { cn } from "@/lib/utils"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { StandardCard } from "@/components/card/card"
import {
  ArrowUpRight,
  CheckCircle2,
  Loader2,
  CircleDot,
  Clock,
} from "lucide-react"
import type { VjudgeTaskWithAccount } from "@rmjac/api-declare"

interface TaskListClientProps {
  tasks: VjudgeTaskWithAccount[]
}

const STATUS_STYLE: Record<
  string,
  { label: string; color: string; icon: React.ElementType }
> = {
  pending: { label: "等待", color: "text-muted-foreground", icon: CircleDot },
  dispatching: { label: "调度中", color: "text-blue-600", icon: Loader2 },
  running: { label: "执行中", color: "text-blue-600", icon: Loader2 },
  waiting: { label: "等待中", color: "text-blue-600", icon: Clock },
  success: { label: "完成", color: "text-green-600", icon: CheckCircle2 },
  completed: { label: "完成", color: "text-green-600", icon: CheckCircle2 },
  failed: { label: "失败", color: "text-red-600", icon: CircleDot },
}

const FILTER_OPTIONS = [
  { value: "all", label: "全部" },
  { value: "pending", label: "等待" },
  { value: "dispatching", label: "调度中" },
  { value: "running", label: "执行中" },
  { value: "waiting", label: "等待中" },
  { value: "success", label: "完成" },
  { value: "failed", label: "失败" },
]

function normalizeStatus(status?: string) {
  const normalized = status?.toLowerCase?.() ?? ""
  if (normalized === "completed") return "success"
  return normalized
}

function getStatusConfig(status: string) {
  const normalized = normalizeStatus(status)
  return (
    STATUS_STYLE[normalized as keyof typeof STATUS_STYLE] ?? {
      label: status || "未知",
      color: "text-muted-foreground",
      icon: CircleDot,
    }
  )
}

function formatDate(value: string) {
  return new Date(value).toLocaleString("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function TaskListClient({ tasks }: TaskListClientProps) {
  const [filter, setFilter] = useState("all")

  const filteredTasks = useMemo(() => {
    if (filter === "all") return tasks
    const normalizedFilter = normalizeStatus(filter)
    return tasks.filter((task) => normalizeStatus(task.task.public.status) === normalizedFilter)
  }, [tasks, filter])

  return (
    <div className="space-y-4">
      <StandardCard title="筛选条件">
        <div className="flex flex-wrap gap-2">
          {FILTER_OPTIONS.map((option) => (
            <Button
              key={option.value}
              variant={filter === option.value ? "default" : "outline"}
              size="sm"
              onClick={() => setFilter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </StandardCard>

      <StandardCard title="任务列表">
        {filteredTasks.length === 0 ? (
          <div className="text-center py-12 text-sm text-muted-foreground">
            暂无任务记录
          </div>
        ) : (
          <div className="space-y-3">
            {filteredTasks.map((item) => {
              const statusCfg = getStatusConfig(item.task.public.status)
              const StatusIcon = statusCfg.icon

              return (
                <div
                  key={item.task.node_id.toString()}
                  className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">
                        工单 #{item.task.node_id.toString()}
                      </span>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", statusCfg.color)}
                      >
                        <StatusIcon
                          className={cn(
                            "mr-1 h-3 w-3",
                            statusCfg.icon === Loader2 && "animate-spin"
                          )}
                        />
                        {statusCfg.label}
                      </Badge>
                    </div>
                    <div className="text-xs text-muted-foreground">
                      {item.platform} · {item.handle}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      服务: {item.task.public.service_name}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 text-xs text-muted-foreground md:text-right">
                    <span>创建于 {formatDate(item.task.public.created_at)}</span>
                    <span>更新于 {formatDate(item.task.public.updated_at)}</span>
                    <Button asChild size="sm" className="w-fit md:ml-auto">
                      <Link href={`/vjudge/task/${item.task.node_id.toString()}`}>
                        查看详情
                        <ArrowUpRight className="ml-1 h-3 w-3" />
                      </Link>
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </StandardCard>
    </div>
  )
}
