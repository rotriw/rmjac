import { notFound } from "next/navigation"
import { TaskDetailClient } from "./client-page"

interface TaskDetailPageProps {
  params: { id: string }
}

export const revalidate = 0

export default function TaskDetailPage({ params }: TaskDetailPageProps) {
  const taskId = params.id
  if (!taskId) {
    notFound()
  }

  return <TaskDetailClient taskId={taskId} />
}
