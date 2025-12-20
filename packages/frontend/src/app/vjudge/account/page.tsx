import { ClientVjudgeAccountPage } from "./client-page"
import { getMyVJudgeAccounts } from "@/lib/api"

export const dynamic = "force-dynamic"

export default async function VjudgeAccountPage() {
  const accounts = await getMyVJudgeAccounts()

  return <ClientVjudgeAccountPage initialAccounts={accounts} />
}
