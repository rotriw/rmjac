"use client"

import { useEffect, useState } from "react"
import { StandardCard } from "@/components/card/card"
import { FormQuery, FormField } from "@/components/tools/query"
import { getMyVJudgeAccounts, assignVJudgeTask, type VJudgeAccount } from "@/api/client/vjudge"
import { socket } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"

interface AddTaskCardProps {
  onSubmitSuccess?: (taskId: number, accountId: number) => void
}

export function AddTaskCard({ onSubmitSuccess }: AddTaskCardProps) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<VJudgeAccount[]>([])
  const [loading, setLoading] = useState(false)
  const [values, setValues] = useState<Record<string, string | string[]>>({
    scope: "recent",
  })

  useEffect(() => {
    getMyVJudgeAccounts().then((data: VJudgeAccount[]) => {
      setAccounts(data || [])
    }).catch((err: Error) => {
      console.error("Failed to load accounts", err)
    })
  }, [])

  const handleSubmit = async () => {
    if (!values.account_id) {
      toast.error("请选择账号")
      return
    }

    setLoading(true)
    
    try {
      const res = await assignVJudgeTask({
        vjudge_node_id: Number(values.account_id),
        range: values.scope as string,
        ws_id: socket.id,
      })
      
      if (res.code === 0 && res.data) {
          const taskId = res.data.node_id;
          const accountId = Number(values.account_id);
          if (onSubmitSuccess) {
            onSubmitSuccess(taskId, accountId);
          } else {
            router.push(`/vjudge/task?id=${taskId}&account_id=${accountId}`);
          }
      } else {
          toast.error(res.msg || "提交失败")
      }
    } catch (e) {
      console.error(e)
      toast.error("提交失败")
    } finally {
      setLoading(false)
    }
  }

  let fields: FormField[] = []
  
  if (accounts.length === 0) {
    fields = [{
        type: "info",
        content: "暂无绑定的VJudge账号，无法同步数据。",
        color: "error"
    }];
  } else {
    fields.push({
        type: "choice-card",
        name: "account_id",
        title: "选择账号",
        cols: 1,
        options: accounts.map(acc => {
            let handle = "Unknown";
            if (acc.private?.auth?.Password) {
                try {
                    const authData = JSON.parse(acc.private.auth.Password);
                    handle = authData.handle || "Unknown";
                } catch {}
            }
            return {
              label: `${acc.public.platform} - ${handle}`,
              value: acc.node_id.toString(),
              description: acc.public.verified ? "已验证" : "未验证"
            }
        })
    })

  fields.push({
      type: "choice-card",
      name: "scope",
      title: "同步范围",
      options: [
        { label: "最近题目", value: "1:50", description: "仅同步最近提交的题目" },
        { label: "全部同步", value: "all", description: "同步所有历史提交记录, 该行为每个帐号5天内仅允许执行一次。" }
      ]
  })

  if (values.scope === "recent") {
    fields.push({
      type: "info",
      content: "仅允许同步最多近100个提交记录。",
      color: "warning"
    })
  } else {
    fields.push({
      type: "info",
      content: "该行为，每个 远程帐号 5天内仅允许执行一次。",
      color: "warning"
    })

  }

  }


  return (
    <StandardCard title="新增任务">
      <div className="space-y-4">
        <FormQuery
          fields={fields}
          values={values}
          onChange={setValues}
        />
        {accounts.length === 0 ? (
            <div className="flex">
                <Link href="/vjudge/account" className="text-sm text-blue-600 hover:underline">
                    前往管理账号绑定
                </Link>
            </div>
        ) :
        <Button onClick={handleSubmit} disabled={loading || accounts.length === 0} className="">
          {loading ? "提交中..." : "提交任务"}
        </Button>}
      </div>
    </StandardCard>
  )
}
