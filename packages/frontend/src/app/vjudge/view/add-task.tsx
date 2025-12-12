"use client"

import { useEffect, useState } from "react"
import { StandardCard } from "@/components/card/card"
import { FormQuery, FormField } from "@/components/tools/query"
import { getVJudgeAccounts, syncVJudgeAccount, VJudgeAccount } from "@/lib/api"
import { Button } from "@/components/ui/button"
import Link from "next/link"

interface AddTaskCardProps {
  onSubmitSuccess?: () => void
}

export function AddTaskCard({ onSubmitSuccess }: AddTaskCardProps) {
  const [accounts, setAccounts] = useState<VJudgeAccount[]>([
    
  ])
  const [loading, setLoading] = useState(false)
  const [values, setValues] = useState<Record<string, any>>({
    scope: "recent",
    limit: "50"
  })

  useEffect(() => {
    getVJudgeAccounts().then(data => {
      setAccounts(data || [])
    }).catch(err => {
      console.error("Failed to load accounts", err)
    })
  }, [])

  const handleSubmit = async () => {
    if (!values.account_id) {
      alert("请选择账号")
      return
    }

    setLoading(true)
    onSubmitSuccess?.() // Show status card immediately
    
    try {
      await syncVJudgeAccount({
        account_id: values.account_id,
        scope: values.scope,
        limit: values.scope === "recent" ? parseInt(values.limit) : undefined
      })
      // alert("任务已提交")
    } catch (e) {
      console.error(e)
      alert("提交失败")
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
        options: accounts.map(acc => ({
          label: `${acc.platform} - ${acc.handle}`,
          value: acc.id,
          description: {
            "public": "公共账号",
            "sync_only": "仅同步数据",
            "submit": "授权远程提交"
          }[acc.permission || "submit"] || "允许提交"
        }))
    })

  fields.push({
      type: "choice-card",
      name: "scope",
      title: "同步范围",
      options: [
        { label: "最近题目", value: "recent", description: "仅同步最近提交的题目" },
        { label: "全部同步", value: "all", description: "同步所有历史提交记录, 该行为每个帐号5天内仅允许执行一次。" }
      ]
  })

  if (values.scope === "recent") {
    fields.push({
      type: "input",
      name: "limit",
      title: "提交记录数量",
      inputType: "number"
    })
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

