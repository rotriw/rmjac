"use client"

import { useMemo, useState } from "react"
import { StandardCard } from "@/components/card/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  postAddProblem,
  postCreate,
  postDelete,
  postList,
  postReorder,
  postRemoveProblem,
  postUpdate,
} from "@/api/client/api_training_todo"
import type { TodoListItem, TodoProblemItem } from "@rmjac/api-declare"
import { toast } from "sonner"

type Props = {
  initialTodos: TodoListItem[]
}

export default function TodoManager({ initialTodos }: Props) {
  const [todos, setTodos] = useState<TodoListItem[]>(initialTodos)
  const [creating, setCreating] = useState(false)
  const [newColor, setNewColor] = useState("#3b82f6")
  const [newDescription, setNewDescription] = useState("")
  const [problemInputs, setProblemInputs] = useState<Record<number, { iden: string; description: string }>>({})

  const stats = useMemo(() => {
    const problemCount = todos.reduce((acc, todo) => acc + todo.problems.length, 0)
    return { todoCount: todos.length, problemCount }
  }, [todos])

  const refresh = async () => {
    const resp = await postList()
    setTodos(resp.todos || [])
  }

  const handleCreate = async () => {
    if (!newDescription.trim()) {
      toast.error("请输入题单描述")
      return
    }
    setCreating(true)
    try {
      await postCreate({ color: newColor, description: newDescription.trim() })
      setNewDescription("")
      await refresh()
      toast.success("题单创建成功")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "创建失败")
    } finally {
      setCreating(false)
    }
  }

  const handleUpdate = async (todoId: number, color: string, description: string) => {
    try {
      await postUpdate({ todo_id: todoId, color, description })
      await refresh()
      toast.success("题单已更新")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "更新失败")
    }
  }

  const handleDelete = async (todoId: number) => {
    try {
      await postDelete({ todo_id: todoId })
      await refresh()
      toast.success("题单已删除")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "删除失败")
    }
  }

  const handleAddProblem = async (todoId: number) => {
    const value = problemInputs[todoId]
    const iden = value?.iden?.trim()
    if (!iden) {
      toast.error("请输入题目标识")
      return
    }
    try {
      await postAddProblem({
        todo_id: todoId,
        problem_iden: iden,
        description: value.description?.trim() || "",
      })
      setProblemInputs((prev) => ({ ...prev, [todoId]: { iden: "", description: "" } }))
      await refresh()
      toast.success("题目已加入题单")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "加入题单失败")
    }
  }

  const handleRemoveProblem = async (todoId: number, problemIden: string) => {
    try {
      await postRemoveProblem({ todo_id: todoId, problem_iden: problemIden })
      await refresh()
      toast.success("题目已移除")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "移除失败")
    }
  }

  const handleReorder = async (
    todoId: number,
    problems: TodoProblemItem[],
    edgeId: number,
    direction: "up" | "down"
  ) => {
    const index = problems.findIndex((problem) => problem.edge_id === edgeId)
    if (index < 0) {
      return
    }

    const targetIndex = direction === "up" ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= problems.length) {
      return
    }

    const next = [...problems]
    const [current] = next.splice(index, 1)
    next.splice(targetIndex, 0, current)

    try {
      await postReorder({ todo_id: todoId, edge_ids: next.map((problem) => problem.edge_id) })
      await refresh()
      toast.success("题目顺序已更新")
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "排序失败")
    }
  }

  return (
    <div className="space-y-4">
      <StandardCard title="概览">
        <div className="flex items-center gap-2 text-sm">
          <Badge variant="secondary">题单 {stats.todoCount}</Badge>
          <Badge variant="secondary">题目 {stats.problemCount}</Badge>
        </div>
      </StandardCard>

      <StandardCard title="创建题单">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Input value={newDescription} onChange={(e) => setNewDescription(e.target.value)} placeholder="题单描述，例如：图论补题" />
          <Input value={newColor} onChange={(e) => setNewColor(e.target.value)} placeholder="颜色，例如 #3b82f6" />
          <Button onClick={handleCreate} disabled={creating}>{creating ? "创建中..." : "创建"}</Button>
        </div>
      </StandardCard>

      {todos.map((todo) => (
        <StandardCard key={todo.id} title={`题单 #${todo.id}`}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
              <Input
                defaultValue={todo.description}
                onBlur={(e) => {
                  const next = e.target.value.trim()
                  if (next !== todo.description) {
                    handleUpdate(todo.id, todo.color, next)
                  }
                }}
              />
              <Input
                defaultValue={todo.color}
                onBlur={(e) => {
                  const next = e.target.value.trim()
                  if (next !== todo.color) {
                    handleUpdate(todo.id, next, todo.description)
                  }
                }}
              />
              <div className="flex items-center text-xs text-muted-foreground">题目数：{todo.problems.length}</div>
              <Button variant="destructive" onClick={() => handleDelete(todo.id)}>删除题单</Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <Input
                placeholder="添加题目标识，例如 abc296_g"
                value={problemInputs[todo.id]?.iden || ""}
                onChange={(e) =>
                  setProblemInputs((prev) => ({
                    ...prev,
                    [todo.id]: { ...prev[todo.id], iden: e.target.value, description: prev[todo.id]?.description || "" },
                  }))
                }
              />
              <Input
                placeholder="备注（可选）"
                value={problemInputs[todo.id]?.description || ""}
                onChange={(e) =>
                  setProblemInputs((prev) => ({
                    ...prev,
                    [todo.id]: { ...prev[todo.id], iden: prev[todo.id]?.iden || "", description: e.target.value },
                  }))
                }
              />
              <Button onClick={() => handleAddProblem(todo.id)}>加入题单</Button>
            </div>

            <div className="space-y-1">
              {todo.problems.length === 0 ? (
                <div className="text-sm text-muted-foreground">暂无题目</div>
              ) : (
                todo.problems.map((problem, index) => (
                  <div key={problem.edge_id} className="flex items-center justify-between rounded-sm border px-3 py-2 text-sm">
                    <span>{problem.problem_iden}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === 0}
                        onClick={() => handleReorder(todo.id, todo.problems, problem.edge_id, "up")}
                      >
                        上移
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        disabled={index === todo.problems.length - 1}
                        onClick={() => handleReorder(todo.id, todo.problems, problem.edge_id, "down")}
                      >
                        下移
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleRemoveProblem(todo.id, problem.problem_iden)}>
                        移除
                      </Button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </StandardCard>
      ))}
    </div>
  )
}
