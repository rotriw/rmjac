import { getTaskList } from "@/api/server/api_vjudge_tasks"
import { TitleCard } from "@/components/card/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { VjudgeTaskWithAccount } from "@rmjac/api-declare"
import { TaskListClient } from "./task-list-client"

export const revalidate = 0

export default async function VJudgeTaskPage() {
  const response = await getTaskList({ page: 1, limit: 50, status: null })
  const payload = response?.data
  const tasks = (payload?.data ?? []) as VjudgeTaskWithAccount[]

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <TitleCard
          title="任务列表"
          description="查看同步任务的执行状态与工作流进度。"
        />
        <Button asChild size="sm">
          <Link href="/vjudge/task/new">创建同步任务</Link>
        </Button>
      </div>

      <TaskListClient tasks={tasks} />
    </div>
  )
}
