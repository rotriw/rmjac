import Link from "next/link"
import { getMyAccounts } from "@/api/server/api_vjudge_my_accounts"
import { TitleCard } from "@/components/card/card"
import { StandardCard } from "@/components/card/card"
import { Button } from "@/components/ui/button"
import { UserPlus } from "lucide-react"
import { VJudgeAccountCard } from "@/api-components/vjudge/vjudge-account-card"
import type { VjudgeNode } from "@rmjac/api-declare"

export const revalidate = 0

export default async function VJudgePage() {
  const response = await getMyAccounts()
  const accounts = (response?.data ?? []) as VjudgeNode[]

  return (
    <div className="space-y-6">
      <TitleCard
        title="VJudge 控制台"
        description="集中管理账号、同步任务与工作流进度。"
      />

      <StandardCard title="我的 VJudge 账号">
        {accounts.length === 0 ? (
          <div className="text-center py-10 border border-dashed rounded-sm bg-muted/10">
            <div className="flex flex-col items-center gap-3">
              <UserPlus className="size-8 text-muted-foreground/50" />
              <div className="space-y-1">
                <p className="text-sm font-bold">暂无绑定账号</p>
                <p className="text-xs text-muted-foreground">
                  先绑定 VJudge 账号，才能创建同步任务。
                </p>
              </div>
              <Button asChild variant="outline" size="sm" className="mt-2 h-7 text-[10px]">
                <Link href="/vjudge/add">立即添加</Link>
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {accounts.map((account) => (
              <VJudgeAccountCard key={account.node_id} account={account} />
            ))}
          </div>
        )}
      </StandardCard>

      <StandardCard title="快速入口">
        <div className="flex flex-wrap gap-3">
          <Button asChild size="sm">
            <Link href="/vjudge/account">管理账号</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/vjudge/task">查看任务</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link href="/vjudge/task/new">创建同步任务</Link>
          </Button>
        </div>
      </StandardCard>
    </div>
  )
}
