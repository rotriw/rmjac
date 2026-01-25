"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { StandardCard, TitleCard } from "@/components/card/card"
import { ViewVjudgeMessage } from "./viewmessage"
import { AddTaskCard } from "./add-task"
import { VjudgeTaskNode } from "@rmjac/api-declare" // Changed import for type
import { getTasks } from "@/api/server/api_vjudge_tasks" // Changed import
import { getMyAccounts } from "@/api/server/api_vjudge_my_accounts" // Changed import
import { Loader2, History, PlusCircle, AlertCircle } from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

export function VjudgePageContent() {
  const searchParams = useSearchParams()
  const taskId = searchParams.get("id")
  const [loading, setLoading] = useState(false)
  const [task, setTask] = useState<VjudgeTaskNode | null>(null) // Changed type
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
        const accountId = searchParams.get("account_id");
        let foundTask = null;

        if (accountId) {
          const tasksResponse = await getTasks({ node_id: Number(accountId).toString() }); // Changed API call
          const tasks = tasksResponse.data; // Access data property
          foundTask = tasks.find(t => t.node_id === Number(taskId)) || null;
        }

        if (!foundTask) {
          const accountsResponse = await getMyAccounts(); // Changed API call
          const accounts = accountsResponse.data; // Access data property
          for (const acc of accounts) {
            if (acc.node_id === Number(accountId)) continue; // Already checked
            const tasksResponse = await getTasks({ node_id: acc.node_id.toString() }); // Changed API call
            const tasks = tasksResponse.data; // Access data property
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
        <div className="">
          <TitleCard title={`Vjudge 任务`} description={`新增任务`} />
          <div className="h-5" />
          <AddTaskCard />
        </div>
      )}
    </div>
  )
}
