import { ClientVjudgeAccountPage } from "./client-page"
import { getMyAccounts } from "@/api/server/api_vjudge_my_accounts" // Changed import: getMyVJudgeAccounts to getMyAccounts

export const dynamic = "force-dynamic"

export default async function VjudgeAccountPage() {
  const accountsResponse = await getMyAccounts() // Call the new API function
  console.log(accountsResponse);
  const accounts = accountsResponse.data; // Access data property from the response
  console.log(233);
  console.log(accounts)
  
  return <ClientVjudgeAccountPage initialAccounts={accounts} />
}
