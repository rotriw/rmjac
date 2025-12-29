import { LogInIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card";

export default function RegisterSuccessPage({
    searchParams
}: {
    searchParams?: { [key: string]: string | string[] | undefined }
}) {
  return (

    <div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-sm flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          注册您的 Rmj.ac 账号
        </a>
        <div className="flex flex-col gap-6">
        <Card className="shadow-none text-neutral-700">
          <CardContent className="duration-300">
          <span className="font-semibold">注册成功，验证邮件已发往您的邮箱。</span>
          <span className="text-sm mt-1"><br/>若未收到，请点击重新发送。<br/>未验证邮件的帐号可能无法查看题目。<br/></span>
          </CardContent>
        </Card>
        <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
          &copy; Rotriw. Some rights reserved.
        </div>
        </div>
      </div>
    </div>
  );
}
