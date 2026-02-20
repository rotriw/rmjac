"use client"

import { useState, useEffect } from "react"
import { RecordEdge, RecordNode, SubtaskUserRecord } from "@rmjac/api-declare"
import { getView as getRecordView } from "@/api/client/api_record_view"
import { TreeTable, TreeTableNode } from "@/components/table/treetable"
import { Loader2, ExternalLink } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { 
  Icond, 
  RecordStatus, 
  RECORD_STATUS_COLOR_MAP, 
  RECORD_STATUS_COLOR_MAP_INTER 
} from "@/api-components/record/status-utils"

interface RecordDetailProps {
  record: RecordEdge
  problemId?: string
  problemName?: string
}

function transformSubtasksToTreeNodes(subtasks: SubtaskUserRecord[], parentId: string = "", pid: string = ""): TreeTableNode[] {
  return subtasks.map((subtask, index) => {
    const displayIndex = index + 1
    const currentId = parentId ? `${parentId}.${displayIndex}` : `${displayIndex}`
    const isGroup = subtask.subtask_status.length > 0

    const rootCollapsedContent = parentId === "" ? (
      <div className="flex w-full items-end justify-baseline text-shadow-white min-h-30">
        <div>
          <div className="text-lg font-bold flex items-center gap-1 min-w-1000">
            <Icond size={5} status={subtask.status} />
            <span className="opacity-90">{subtask.score} </span>
            <span className="opacity-90">{subtask.status}</span>
          </div>
          <span className="ml-1 mr-1 text-sm border-current opacity-50 hover:opacity-100">{subtask.time} ms</span>
          ·
          <span className="ml-1 mr-1 text-sm border-current opacity-50 hover:opacity-100">{subtask.memory} KB</span>
          ·
          <span className="ml-1 mr-1 text-sm border-current opacity-50 hover:opacity-100">{pid}</span>
        </div>
      </div>
    ) : undefined

    const defaultExpanded = subtask.status !== "Accepted" && subtask.subtask_status.length > 0

    return {
      id: currentId,
      background: RECORD_STATUS_COLOR_MAP_INTER[subtask.status],
      collapsedContent: rootCollapsedContent,
      content_title: (
        parentId === "" ? <div className="flex items-center gap-2 text-sm font-medium">
          <div className="flex items-center gap-1">
            <Icond size={2.5} status={subtask.status} />
            <span className="mr-1 border-current font-bold">{subtask.score}</span>
            {subtask.status} <span className="ml-1 mr-1 border-current font-bold">{subtask.time} ms</span>·
            <span className="ml-1 border-current font-bold">{subtask.memory} KB</span>
          </div>
        </div> : <div className="flex items-center gap-2 text-sm font-medium">
          <span className="font-semibold">{isGroup ? "Subtask" : "Testcase"} {currentId.slice(2, )}</span>
          <div className="flex items-center gap-1">
            <Icond size={2.5} status={subtask.status} />
            {subtask.status}
          </div>
        </div>
      ),
      content: (
        parentId === "" ? <>
        </> :
        <>
          <span className="mr-1 border-current font-bold opacity-50 hover:opacity-100">{subtask.score} pts</span>
          ·
          <span className="ml-1 mr-1 border-current opacity-50 hover:opacity-100">{subtask.time} ms</span>
          ·
          <span className="ml-1 border-current opacity-50 hover:opacity-100">{subtask.memory} KB</span>
        </>
      ),
      children: isGroup ? transformSubtasksToTreeNodes(subtask.subtask_status, currentId) : [],
      defaultExpanded: defaultExpanded,
    }
  })
}

export default function RecordDetail({ record, problemId, problemName }: RecordDetailProps) {
  const [recordNode, setRecordNode] = useState<RecordNode | null>(null)
  const [judgeData, setJudgeData] = useState<SubtaskUserRecord | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchRecordDetail = async () => {
      try {
        setIsLoading(true)
        const response = await getRecordView({ record_id: String(record.record_node_id) })
        setRecordNode(response.record)
        setJudgeData(response.judge_data)
      } catch (error) {
        const msg = error instanceof Error ? error.message : "获取记录详情失败"
        toast.error(msg)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecordDetail()
  }, [record.record_node_id])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12 gap-2 text-muted-foreground">
        <Loader2 className="size-4 animate-spin" />
        加载记录详情中...
      </div>
    )
  }

  if (!recordNode || !judgeData) {
    return (
      <div className="text-center text-muted-foreground py-8">
        无法加载记录详情
      </div>
    )
  }

  const treeData = transformSubtasksToTreeNodes([judgeData])

  return (
    <div className="space-y-4">
      {/* 记录基本信息 */}
      <div className="border rounded-lg p-4 bg-muted/50">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div>
              <div className="text-sm text-muted-foreground">编程语言</div>
              <div className="font-semibold">{recordNode.public.code_language || "未知"}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">提交时间</div>
              <div className="font-semibold">{new Date(recordNode.public.record_time).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex items-center gap-4">
            {problemId && (
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-2"
              >
                <a href={`/problem/${problemId}`}>
                  查看题目
                  <ExternalLink className="size-4" />
                </a>
              </Button>
            )}
            <div className="text-right">
              <div style={{ color: RECORD_STATUS_COLOR_MAP[judgeData.status] }} className="text-2xl font-bold">
                {judgeData.status}
              </div>
              <div className="text-sm text-muted-foreground">评测结果</div>
            </div>
          </div>
        </div>
      </div>

      {/* 评测详情 */}
      <div className="border rounded-lg overflow-hidden">
        <div className="border-b bg-muted/50 px-4 py-2">
          <h3 className="font-semibold">评测详情</h3>
        </div>

        <pre className="bg-gray-100 p-4 rounded-md overflow-x-auto text-sm">
          <code>
            {recordNode.private.code}
          </code>
        </pre>
        {treeData.length > 0 ? (
          <div className="p-4">
            <TreeTable data={treeData} />
          </div>
        ) : (
          <div className="p-4 text-center text-muted-foreground">
            暂无评测数据
          </div>
        )}
      </div>
    </div>
  )
}
