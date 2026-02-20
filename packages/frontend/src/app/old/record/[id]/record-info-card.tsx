"use client"

import { useState, useEffect } from "react"
import { StandardCard } from "@/components/card/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, Loader2 } from "lucide-react"
import { getList as getRecordList } from "@/api/client/api_record_list"
import { getView as getRecordView } from "@/api/client/api_record_view"
import { postRefresh as refreshRecord } from "@/api/client/api_record_manage"
import { getMyAccounts } from "@/api/client/api_vjudge_my_accounts"
import { Select, SelectItem } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { RecordNode, VjudgeNode } from "@rmjac/api-declare"
import Link from "next/link"
import { toast } from "sonner"

interface RecordInfoCardProps {
  record: RecordNode
  recordId: string
}

export default function RecordInfoCard({ record, recordId }: RecordInfoCardProps) {
  const [recordState, setRecordState] = useState<RecordNode>(record)
  const [problemId, setProblemId] = useState<string | null>(null)
  const [problemName, setProblemName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [accounts, setAccounts] = useState<VjudgeNode[]>([])
  const [selectedAccountId, setSelectedAccountId] = useState<string>("")
  const [isLoadingAccounts, setIsLoadingAccounts] = useState(false)

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

  useEffect(() => {
    let active = true
    const platformKey = recordState.public.record_platform?.toLowerCase?.() || ""
    const loadAccounts = async () => {
      try {
        setIsLoadingAccounts(true)
        const resp = await getMyAccounts()
        if (!active) return
        const list = resp.data || []
        setAccounts(list)
        const matched = list.find((acc) => acc.public.platform.toLowerCase() === platformKey)
        if (matched) {
          setSelectedAccountId(matched.node_id.toString())
        }
      } catch (error) {
        console.error("Failed to load VJudge accounts", error)
      } finally {
        if (active) setIsLoadingAccounts(false)
      }
    }
    loadAccounts()
    return () => {
      active = false
    }
  }, [recordState.public.record_platform])

  const handleRefresh = async () => {
    if (!selectedAccountId) {
      toast.error("请选择一个 VJudge 账号")
      return
    }
    try {
      setIsRefreshing(true)
      await refreshRecord({ record_id: recordId, vjudge_id: Number(selectedAccountId) })
      const resp = await getRecordView({ record_id: recordId })
      setRecordState(resp.record)
      // 如果状态已更新，刷新整页以同步树形结果
      if (resp.record.public.record_status !== "Waiting") {
        window.location.reload()
      }
    } catch (error) {
      console.error("Failed to refresh record:", error)
      toast.error("刷新失败")
    } finally {
      setIsRefreshing(false)
    }
  }

  return (
    <StandardCard title="信息">
      <div className="text-sm space-y-3">
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
        {recordState.public.record_url !== "[no-fetch]" && (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full sm:w-auto sm:justify-end">
              <div className="w-full sm:w-44">
                <Label className="text-[11px] text-muted-foreground">VJudge 账号</Label>
                {isLoadingAccounts ? (
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Loader2 className="size-3 animate-spin" />
                    加载中...
                  </div>
                ) : accounts.length > 0 ? (
                  <Select value={selectedAccountId} onValueChange={setSelectedAccountId}>
                    <SelectItem value="" disabled>选择账号</SelectItem>
                    {accounts
                      .filter((acc) => acc.public.platform.toLowerCase() === recordState.public.record_platform.toLowerCase())
                      .map((acc) => (
                        <SelectItem key={acc.node_id.toString()} value={acc.node_id.toString()}>
                          {acc.public.iden}
                        </SelectItem>
                      ))}
                  </Select>
                ) : (
                  <div className="text-xs text-muted-foreground">暂无账号</div>
                )}
              </div>
              <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isRefreshing || !selectedAccountId}>
                {isRefreshing && <Loader2 className="mr-2 size-4 animate-spin" />}
                刷新状态
              </Button>
            </div>
          )}
        <div><strong>平台:</strong> {recordState.public.record_platform}</div>
        <div className="flex items-center justify-between gap-2">
          <span><strong>状态:</strong> {recordState.public.record_status}</span>
        </div>
        <div><strong>分数:</strong> {recordState.public.record_score}</div>
        <div><strong>提交时间:</strong> {recordState.public.record_time}</div>
        <div><strong>最后更新:</strong> {recordState.public.record_update_time}</div>
        <div><strong>语言:</strong> {recordState.private.code_language}</div>
        <div><strong>原始记录链接:</strong> <a href={recordState.public.record_url || ""} className="text-blue-600 underline">{recordState.public.record_url}</a></div>
      </div>
    </StandardCard>
  )
}
