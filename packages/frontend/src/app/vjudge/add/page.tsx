import { TitleCard } from "@/components/card/card"
import { AddAccountForm } from "@/components/vjudge/add-account-form"

export default function VJudgeAddAccountPage() {
  return (
    <div className="space-y-6">
      <TitleCard
        title="绑定账号"
        description="添加新的 VJudge 平台账号，完成验证后即可同步提交。"
      />
      <AddAccountForm />
    </div>
  )
}
