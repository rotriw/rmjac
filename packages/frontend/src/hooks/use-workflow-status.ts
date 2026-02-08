"use client"

import { useEffect, useState, useCallback, useRef } from "react"
import { socket } from "@/lib/socket"

/**
 * 工作流状态更新事件数据
 * 对齐后端 WorkflowStatusUpdate
 */
export interface WorkflowStatusUpdate {
  task_id: string
  status_type: string
  is_final: boolean
  success: boolean
  output?: Record<string, unknown>
  error?: string | null
  timestamp: string
}

interface UseWorkflowStatusOptions {
  /** 只监听指定 task_id 的更新, null 表示监听所有 */
  taskId?: string | null
  /** 收到更新后的回调 */
  onUpdate?: (update: WorkflowStatusUpdate) => void
  /** 收到 final 状态后的回调 */
  onComplete?: (update: WorkflowStatusUpdate) => void
}

interface UseWorkflowStatusReturn {
  /** 最新状态 */
  latestStatus: WorkflowStatusUpdate | null
  /** 全部收到的状态列表 (时间顺序) */
  statusHistory: WorkflowStatusUpdate[]
  /** 是否已完成 (收到 is_final=true) */
  isCompleted: boolean
  /** 是否成功 */
  isSuccess: boolean | null
  /** 错误信息 */
  error: string | null
  /** 清空历史 */
  clearHistory: () => void
}

/**
 * useWorkflowStatus - 监听工作流任务的实时状态更新
 *
 * 后端通过 user_notify 命名空间推送 `vjudge_workflow_update` 事件
 * 此 hook 封装了 socket 事件监听和状态管理
 */
export function useWorkflowStatus(options: UseWorkflowStatusOptions = {}): UseWorkflowStatusReturn {
  const { taskId, onUpdate, onComplete } = options
  const [latestStatus, setLatestStatus] = useState<WorkflowStatusUpdate | null>(null)
  const [statusHistory, setStatusHistory] = useState<WorkflowStatusUpdate[]>([])
  const [isCompleted, setIsCompleted] = useState(false)
  const [isSuccess, setIsSuccess] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)

  // 用 ref 保存最新的回调，避免频繁重新注册监听
  const onUpdateRef = useRef(onUpdate)
  const onCompleteRef = useRef(onComplete)
  onUpdateRef.current = onUpdate
  onCompleteRef.current = onComplete

  const clearHistory = useCallback(() => {
    setLatestStatus(null)
    setStatusHistory([])
    setIsCompleted(false)
    setIsSuccess(null)
    setError(null)
  }, [])

  useEffect(() => {
    function handleWorkflowUpdate(rawData: string | WorkflowStatusUpdate) {
      const data: WorkflowStatusUpdate =
        typeof rawData === "string" ? JSON.parse(rawData) : rawData

      // 如果指定了 taskId，只处理匹配的更新
      if (taskId && data.task_id !== taskId) return

      setLatestStatus(data)
      setStatusHistory((prev) => [...prev, data])

      if (data.error) {
        setError(data.error)
      }

      // 调用更新回调
      onUpdateRef.current?.(data)

      // 处理最终状态
      if (data.is_final) {
        setIsCompleted(true)
        setIsSuccess(data.success)
        onCompleteRef.current?.(data)
      }
    }

    socket.on("vjudge_workflow_update", handleWorkflowUpdate)
    return () => {
      socket.off("vjudge_workflow_update", handleWorkflowUpdate)
    }
  }, [taskId])

  return {
    latestStatus,
    statusHistory,
    isCompleted,
    isSuccess,
    error,
    clearHistory,
  }
}
