import { TitleCard } from "@/components/card/card";
import { AppSidebar } from "@/components/layout/app-sidebar";
import TodoManager from "./todo-manager";
import { postList } from "@/api/server/api_training_todo";

export default async function TodoPage() {
  let initialTodos: any[] = []
  try {
    const data = await postList()
    initialTodos = data.todos || []
  } catch {
    initialTodos = []
  }

  return (
    <>
      <AppSidebar path="problem" />
      <div className="p-5 bg-white w-full">
        <TitleCard title="TODO List" description="题单管理" />
        <TodoManager initialTodos={initialTodos} />
      </div>
    </>
  )
}
