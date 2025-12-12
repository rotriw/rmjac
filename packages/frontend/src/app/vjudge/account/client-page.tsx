"use client"

import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { VJudgeAccountCard } from "@/components/vjudge/account-card"
import { AddAccountForm } from "@/components/vjudge/add-account-form"
import { VJudgeAccount } from "@/lib/api"
import { StandardCard } from "@/components/card/card"

interface ClientPageProps {
  initialAccounts: VJudgeAccount[]
}

export function ClientVjudgeAccountPage({ initialAccounts }: ClientPageProps) {
  const [accounts] = useState<VJudgeAccount[]>(initialAccounts)

  return (
    <div className="space-y-6">
      <Tabs defaultValue="manage" className="w-full">
        <TabsList className="grid w-full grid-cols-2 max-w-[400px] mb-4">
          <TabsTrigger value="manage">已有账号</TabsTrigger>
          <TabsTrigger value="add">添加新账号</TabsTrigger>
        </TabsList>
        <TabsContent value="manage">
            <StandardCard title="已绑定的 Vjudge 账号">
                {accounts.length === 0 ? (
                    <div className="text-center py-10 text-muted-foreground border border-dashed rounded-lg bg-gray-50/50">
                        暂无绑定账号。请切换到“添加新账号”标签页进行添加。
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-2">
                        {accounts.map(account => (
                            <VJudgeAccountCard key={account.id} account={account} />
                        ))}
                    </div>
                )}
            </StandardCard>
        </TabsContent>
        <TabsContent value="add">
          <div className="">
             <AddAccountForm />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
