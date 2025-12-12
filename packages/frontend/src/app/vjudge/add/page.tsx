import { TitleCard } from "@/components/card/card";
import { AddAccountForm } from "@/components/vjudge/add-account-form";

export default function AddVjudgeAccountPage() {
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="mb-6">
            <TitleCard title="新增账号绑定" description="绑定一个新的 Vjudge 账号" />
        </div>
        <div className="mt-6 flex justify-center">
            <AddAccountForm />
        </div>
    </div>
  )
}
