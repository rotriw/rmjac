"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { StandardCard, TitleCard } from "@/components/card/card"
import { ViewVjudgeMessage } from "./viewmessage"
import { AddTaskCard } from "./add-task"
import { VjudgeTaskNode } from "@rmjac/api-declare"
import { getTasks } from "@/api/server/api_vjudge_tasks"
import { getMyAccounts } from "@/api/server/api_vjudge_my_accounts"
import { Loader2, AlertCircle, CalendarClock, Clock, CheckCircle2, XCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

/**
 * 状态映射配置
 */
const statusConfig: Record<string, { label: string; color: string; bgColor: string; icon: React.ReactNode }> = {
  "completed": { 
    label: "已完成", 
    color: "text-green-600", 
    bgColor: "bg-green-500/10 border-green-500/20",
    icon: <CheckCircle2 className="size-4" />
  },
  "failed": { 
    label: "失败", 
    color: "text-red-600", 
    bgColor: "bg-red-500/10 border-red-500/20",
    icon: <XCircle className="size-4" />
  },
  "cron_online": { 
    label: "定时运行中", 
    color: "text-emerald-600", 
    bgColor: "bg-emerald-500/10 border-emerald-500/20",
    icon: <CalendarClock className="size-4" />
  },
  "waiting": { 
    label: "等待中", 
    color: "text-yellow-600", 
    bgColor: "bg-yellow-500/10 border-yellow-500/20",
    icon: <Clock className="size-4" />
  },
  "running": { 
    label: "运行中", 
    color: "text-blue-600", 
    bgColor: "bg-blue-500/10 border-blue-500/20",
    icon: <Loader2 className="size-4 animate-spin" />
  },
}

/**
 * 获取状态配置，带默认值
 */
function getStatusConfig(status: string) {
  return statusConfig[status] || {
    label: status,
    color: "text-gray-600",
    bgColor: "bg-gray-500/10 border-gray-500/20",
    icon: <Clock className="size-4" />
  }
}

export function VjudgePageContent() {
  const searchParams = useSearchParams()
  const taskId = searchParams?.get("id")
  const [loading, setLoading] = useState(false)
  const [task, setTask] = useState<VjudgeTaskNode | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    const fetchTaskDetail = async () => {
      if (!taskId) {
        setTask(null)
        return
      }

      setLoading(true)
      setError("")
      try {
        const accountId = searchParams?.get("account_id");
        let foundTask = null;

        if (accountId) {
          const tasksResponse = await getTasks({ node_id: accountId });
          const tasks = tasksResponse.data;
          // 使用字符串比较以避免 BigInt/Number 类型不匹配问题
          foundTask = tasks.find(t => t.node_id.toString() === taskId) || null;
        }

        if (!foundTask) {
          const accountsResponse = await getMyAccounts();
          const accounts = accountsResponse.data;
          for (const acc of accounts) {
            // 使用字符串比较
            if (acc.node_id.toString() === accountId) continue;
            const tasksResponse = await getTasks({ node_id: acc.node_id.toString() });
            const tasks = tasksResponse.data;
            const t = tasks.find(t => t.node_id.toString() === taskId);
            if (t) {
              foundTask = t;
              break;
            }
          }
        }

        if (foundTask) {
          setTask(foundTask)
        } else {
          setError("找不到该任务详情")
        }
      } catch (err) {
        console.error(err)
        setError("获取任务详情失败")
      } finally {
        setLoading(false)
      }
    }

    fetchTaskDetail()
  }, [taskId, searchParams])

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-primary mb-4" />
        <p className="text-sm text-muted-foreground">正在加载任务详情...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    )
  }

  const isCronTask = task?.public.status === "cron_online"
  const statusCfg = task ? getStatusConfig(task.public.status) : null

  return (
    <div className="animate-in fade-in duration-300">
      {taskId && task ? (
        <div className="space-y-4">
          {/* 标题卡片 */}
          <TitleCard 
            title={isCronTask ? "定时任务详情" : "任务详情"} 
            description={`TASKID: ${taskId}`} 
          />
          
          {/* 任务消息展示 */}
          <ViewVjudgeMessage initialLog={task.public.log} initialStatus={task.public.status} />
          
          {/* 任务元数据卡片 */}
          <StandardCard title="任务元数据">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
              {/* 创建时间 */}
              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="size-3" />
                  创建时间
                </div>
                <span className="font-semibold">
                  {new Date(task.public.created_at).toLocaleString()}
                </span>
              </div>
              
              {/* 最后更新 */}
              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  <Clock className="size-3" />
                  最后更新
                </div>
                <span className="font-semibold">
                  {new Date(task.public.updated_at).toLocaleString()}
                </span>
              </div>
              
              {/* 当前状态 */}
              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  任务状态
                </div>
                {statusCfg && (
                  <Badge 
                    variant="outline" 
                    className={cn("mt-1", statusCfg.bgColor, statusCfg.color)}
                  >
                    {statusCfg.icon}
                    <span className="ml-1">{statusCfg.label}</span>
                  </Badge>
                )}
              </div>
              
              {/* 任务 ID */}
              <div className="p-3 rounded-lg bg-muted/30 border">
                <div className="flex items-center gap-2 text-muted-foreground mb-1">
                  任务 ID
                </div>
                <code className="font-mono font-semibold bg-background px-2 py-0.5 rounded text-[11px]">
                  {task.node_id.toString()}
                </code>
              </div>
            </div>
            
            {/* Cron 任务额外信息 */}
            {isCronTask && (
              <div className="mt-4 p-4 rounded-lg bg-emerald-500/5 border border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-600 mb-2">
                  <CalendarClock className="size-4" />
                  <span className="font-medium text-sm">定时任务信息</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  此任务为定时执行任务，系统会根据配置的 Cron 表达式周期性执行。
                  执行历史和详细配置请查看上方的执行历史卡片。
                </p>
              </div>
            )}
          </StandardCard>
        </div>
      ) : (
        <div className="">
          <TitleCard title={`Vjudge 任务`} description={`新增任务`} />
          <div className="h-5" />
          <AddTaskCard />
        </div>
      )}
    </div>
  )
}
