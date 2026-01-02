"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { StandardCard, TitleCard } from "@/components/card/card"
import { ViewVjudgeMessage } from "./viewmessage"
import { AddTaskCard } from "./add-task"
import { VJudgeTask, listVJudgeTasks, getMyVJudgeAccounts } from "@/api/server/vjudge"
import { Loader2, History, PlusCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function VjudgePageContent() {
  const searchParams = useSearchParams()
  const taskId = searchParams.get("id")
  const [loading, setLoading] = useState(false)
  const [task, setTask] = useState<VJudgeTask | null>(null)
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
        // We need to find which account this task belongs to.
        // Currently, the backend doesn't provide a direct getTaskById API.
        // However, we can optimize by checking the account_id if it was provided in the URL,
        // or by fetching all accounts and their tasks.
        const accountId = searchParams.get("account_id");
        let foundTask = null;

        if (accountId) {
          const tasks = await listVJudgeTasks(Number(accountId));
          foundTask = tasks.find(t => t.node_id === Number(taskId)) || null;
        }

        if (!foundTask) {
          const accounts = await getMyVJudgeAccounts();
          for (const acc of accounts) {
            if (acc.node_id === Number(accountId)) continue; // Already checked
            const tasks = await listVJudgeTasks(acc.node_id);
            const t = tasks.find(t => t.node_id === Number(taskId));
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
  }, [taskId])

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

  return (
    <div className="animate-in fade-in duration-300">
      {taskId && task ? (
        <div className="">
          <TitleCard title={`任务详情`} description={`TASKID: ${taskId}`} />
          <ViewVjudgeMessage initialLog={task.public.log} initialStatus={task.public.status} />
          
          <StandardCard title="任务元数据">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">创建时间</span>
                <span className="font-bold">{new Date(task.public.created_at).toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">最后更新</span>
                <span className="font-bold">{new Date(task.public.updated_at).toLocaleString()}</span>
              </div>
              <div className="flex flex-col gap-1">
                <span className="text-muted-foreground">当前状态</span>
                <span className="font-bold uppercase">{task.public.status}</span>
              </div>
            </div>
          </StandardCard>
        </div>
      ) : (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-primary mb-2">
            <PlusCircle className="size-5" />
            <h2 className="text-lg font-bold">创建新同步任务</h2>
          </div>
          <AddTaskCard />
        </div>
      )}
    </div>
  )
}
