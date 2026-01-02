"use client"

import { useState } from "react"
import { VJudgeAccountCard } from "@/components/vjudge/account-card"
import { VJudgeAccount } from "@/api/server/vjudge"
import { StandardCard, TitleCard } from "@/components/card/card"
import { UserPlus } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"

interface ClientPageProps {
  initialAccounts: VJudgeAccount[]
}

export function ClientVjudgeAccountPage({ initialAccounts }: ClientPageProps) {
  const [accounts] = useState<VJudgeAccount[]>(initialAccounts)

  return (
    <div className="py-6 px-4 md:px-6 animate-in fade-in duration-300">
      <div className="mb-6 flex justify-between items-start">
        <TitleCard
          title="账号概览"
          description="管理您已绑定的 VJudge 账号，或添加新的平台支持。"
        />
        <Button asChild size="sm" className="h-8 text-xs">
          <Link href="/vjudge/add">
            <UserPlus className="mr-2 size-3" />
            添加新账号
          </Link>
        </Button>
      </div>

      <StandardCard title="已绑定的 VJudge 账号">
        {accounts.length === 0 ? (
          <div className="text-center py-12 border border-dashed rounded-sm bg-muted/10">
            <div className="flex flex-col items-center gap-3">
              <UserPlus className="size-8 text-muted-foreground/50" />
              <div className="space-y-1">
                <p className="text-sm font-bold">暂无绑定账号</p>
                <p className="text-xs text-muted-foreground">
                  绑定账号后，您可以直接在 Rmjac 提交题目到外部平台。
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-2 h-7 text-[10px]">
                <Link href="/vjudge/add">立即添加</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map(account => (
              <VJudgeAccountCard key={account.node_id} account={account} />
            ))}
          </div>
        )}
      </StandardCard>
    </div>
  )
}
