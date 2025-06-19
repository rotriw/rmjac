import { LogInIcon } from "lucide-react"

import { RegisterForm } from "@/components/register-form"

export default function RegisterPage() {

  return (
    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          
          注册您的 Rmj.ac 账号
        </a>
        <RegisterForm />
      </div>
    </div>
  )
}
