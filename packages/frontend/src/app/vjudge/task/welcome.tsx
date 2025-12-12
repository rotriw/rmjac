"use client"

import { StandardCard } from "@/components/card/card"
import { Archive, ArrowRight } from "lucide-react"

export function VjudgeWelcome() {
  return (
    <StandardCard title="准备同步">
      <div className="flex flex-col items-center justify-center min-h-[300px] text-center space-y-4 p-8">
        <div className="h-16 w-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mb-4">
          <Archive size={32} />
        </div>
        <h3 className="text-lg font-semibold">同步远程题目提交状态</h3>
        <p className="text-muted-foreground max-w-md">
          在左侧选择您的 VJudge 账号和同步范围，我们将自动抓取并更新您的提交记录。
          支持全部同步或仅同步最近的题目。
        </p>
        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-8">
          <span>选择账号</span>
          <ArrowRight size={16} />
          <span>设定范围</span>
          <ArrowRight size={16} />
          <span>开始同步</span>
        </div>
      </div>
    </StandardCard>
  )
}

