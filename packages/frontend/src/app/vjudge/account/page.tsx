import { TitleCard } from "@/components/card/card";
import { getVJudgeAccounts } from "@/lib/api";
import { ClientVjudgeAccountPage } from "./client-page";

export default async function ViewVjudgePage() {
  const accounts = await getVJudgeAccounts();

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
            <TitleCard title="Vjudge 账号管理" description="管理您绑定的 Vjudge 账号与权限" />
        </div>
        <ClientVjudgeAccountPage initialAccounts={accounts} />
    </div>
  )
}
