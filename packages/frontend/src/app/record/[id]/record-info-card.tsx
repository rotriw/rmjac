"use client"

import { useState, useEffect } from "react"
import { StandardCard } from "@/components/card/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Loader2 } from "lucide-react"
import { getList as getRecordList } from "@/api/client/api_record_list"
import { RecordNode } from "@rmjac/api-declare"
import Link from "next/link"

interface RecordInfoCardProps {
  record: RecordNode
  recordId: string
}

export default function RecordInfoCard({ record, recordId }: RecordInfoCardProps) {
  const [problemId, setProblemId] = useState<string | null>(null)
  const [problemName, setProblemName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchProblemInfo = async () => {
      try {
        setIsLoading(true)
        // 通过 record_id 查找对应的记录来获取题目信息
        const response = await getRecordList({
          page: 1,
          per_page: 100
        })
        
        const recordItem = response.records.find(
          r => String(r.edge.record_node_id) === recordId
        )
        
        if (recordItem) {
          setProblemId(recordItem.problem_iden)
          setProblemName(recordItem.problem_name)
        }
      } catch (error) {
        console.error("Failed to fetch problem info:", error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchProblemInfo()
  }, [recordId])

  return (
    <StandardCard title="信息">
      <div className="text-sm space-y-2">
        {problemId && (
          <div className="mb-3 pb-3 border-b">
            <div className="flex items-center justify-between gap-2">
              <div>
                <div className="text-xs text-muted-foreground mb-1">题目</div>
                <div className="font-medium">{problemName || problemId}</div>
              </div>
              <Button
                variant="outline"
                size="sm"
                asChild
                className="gap-2"
              >
                <Link href={`/problem/${problemId}`}>
                  查看题目
                  <ExternalLink className="size-3.5" />
                </Link>
              </Button>
            </div>
          </div>
        )}
        {isLoading && !problemId && (
          <div className="mb-3 pb-3 border-b flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2 className="size-3 animate-spin" />
            加载题目信息...
          </div>
        )}
        <div><strong>平台:</strong> {record.public.record_platform}</div>
        <div><strong>状态:</strong> {record.public.record_status}</div>
        <div><strong>分数:</strong> {record.public.record_score}</div>
        <div><strong>提交时间:</strong> {record.public.record_time}</div>
        <div><strong>最后更新:</strong> {record.public.record_update_time}</div>
        <div><strong>语言:</strong> {record.private.code_language}</div>
        <div><strong>原始记录链接:</strong> <a href={record.public.record_url || ""} className="text-blue-600 underline">{record.public.record_url}</a></div>
      </div>
    </StandardCard>
  )
}
