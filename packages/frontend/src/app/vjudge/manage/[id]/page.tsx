import { notFound } from "next/navigation"
import { getDetail } from "@/api/server/api_vjudge_account"
import { StandardCard, TitleCard } from "@/components/card/card"
import { ManageActions } from "@/components/vjudge/manage-actions"
import { Badge } from "@/components/ui/badge"
import { CheckCircle2, XCircle } from "lucide-react"

interface ManageAccountPageProps {
  params: { id: string }
}

export const revalidate = 0

export default async function ManageAccountPage({ params }: ManageAccountPageProps) {
  let account
  try {
    const response = await getDetail({ node_id: params.id })
    account = response.data
  } catch (error) {
    console.error(error)
    notFound()
  }

  if (!account) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <TitleCard
        title="账号管理"
        description="查看账号状态并触发同步或验证流程。"
      />

      <StandardCard title="账号信息">
        <div className="space-y-3 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">平台</span>
            <span className="font-semibold">{account.public.platform}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">账号</span>
            <span className="font-semibold">{account.public.iden}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">状态</span>
            {account.public.verified ? (
              <Badge variant="outline" className="text-green-600 border-green-200 bg-green-50">
                <CheckCircle2 className="mr-1 h-3 w-3" />
                已验证
              </Badge>
            ) : (
              <Badge variant="outline" className="text-red-600 border-red-200 bg-red-50">
                <XCircle className="mr-1 h-3 w-3" />
                未验证
              </Badge>
            )}
          </div>
        </div>
      </StandardCard>

      <StandardCard title="操作">
        <ManageActions nodeId={Number(account.node_id)} />
      </StandardCard>
    </div>
  )
}
