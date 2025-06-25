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
        <Card>
          <CardContent className="duration-300">
          <span>注册成功！请前往您的邮箱<a className="px-1 font-semibold underline underline-offset-4">{(searchParams || {})['email']}</a>
          激活账号。</span>
          <Button className="mt-4" variant="default" asChild>
            <a href="/login">
              <LogInIcon className="mr-2 h-4 w-4" />
              前往登录
            </a>
            </Button>
          </CardContent>
        </Card>
        </div>
      </div>
    </div>
  );
}
