"use client"

import { useEffect, useState } from "react"
import { useAuth } from "@/contexts/auth-context"
import { postQueryUserSubmission } from "@/api/client/api_record_query"
import { Icond, RECORD_STATUS_COLOR_MAP } from "@/api-components/record/status-utils"
import { mapJudgeStatusToRecordStatus } from "@/app/record/utils"
import { Check, X, Minus, Loader2, History } from "lucide-react"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import type { QueryResult } from "@rmjac/api-declare"

interface ProblemUserStatusProps {
  problemIden: string
}

export function ProblemUserStatus({ problemIden }: ProblemUserStatusProps) {
  const { user, isLoading: authLoading } = useAuth()
  const [records, setRecords] = useState<QueryResult[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (authLoading) return
    if (!user) {
      setLoading(false)
      return
    }

    const fetchRecords = async () => {
      try {
        const res = await postQueryUserSubmission({
          user_id: user.node_id,
          problem_iden: problemIden,
          offset: 0,
          show_number: 10,
        })
        setRecords(res?.records ?? [])
      } catch {
        setError(true)
      } finally {
        setLoading(false)
      }
    }

    fetchRecords()
  }, [user, authLoading, problemIden])

  if (authLoading || loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground py-2">
        <Loader2 className="size-4 animate-spin" />
        加载提交状态...
      </div>
    )
  }

  if (!user) {
    return null
  }

  if (error) {
    return null
  }

  const passed = records.some(r => r.record.judge_detail.status === "Accepted")
  const bestRecord = records.length > 0
    ? records.reduce((best, cur) => {
        const bestScore = best.record.judge_detail.is_passed ? 100 : 0
        const curScore = cur.record.judge_detail.is_passed ? 100 : 0
        return curScore > bestScore ? cur : best
      }, records[0])
    : null

  const latestRecord = records.length > 0 ? records[0] : null

  return (
    <div className="flex items-center gap-3 py-2">
      <div className="flex items-center gap-1.5">
        {passed ? (
          <Check className="size-4 text-green-600" />
        ) : records.length > 0 ? (
          <X className="size-4 text-red-500" />
        ) : (
          <Minus className="size-4 text-muted-foreground" />
        )}
        <span className={`text-sm font-medium ${passed ? "text-green-600" : records.length > 0 ? "text-red-500" : "text-muted-foreground"}`}>
          {passed ? "已通过" : records.length > 0 ? "未通过" : "未提交"}
        </span>
      </div>

      {records.length > 0 && (
        <>
          <span className="text-xs text-muted-foreground">
            {records.length} 次提交
          </span>
          {latestRecord && (
            <Link href={`/record/${latestRecord.record.id}`} className="text-xs text-blue-500 hover:underline">
              最近提交
            </Link>
          )}
        </>
      )}

      <Button variant="outline" size="sm" asChild className="ml-auto gap-1.5 h-7 text-xs">
        <Link href={`/record?problemIden=${encodeURIComponent(problemIden)}`}>
          <History className="size-3" />
          历史提交
        </Link>
      </Button>
    </div>
  )
}
