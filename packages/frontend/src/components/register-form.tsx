import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function RegisterForm({
  className,
  ...props
}: React.ComponentProps<"div">) {

  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardContent>
          <form>
            <div className="grid gap-6">
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="user">用户名</Label>
                  <Input
                    id="username"
                    type="user"
                    placeholder=""
                    required
                  />
                    <Label htmlFor="user" className="text-xs text-muted-foreground">
                      该用户名作为唯一标识符，只能包含字母、数字和下划线。长度为 3-20 个字符。
                    </Label>
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="email">邮箱</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="a@example.com"
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <Label htmlFor="user">显示的用户名</Label>
                  <Input
                    id="username"
                    type="user"
                    placeholder=""
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">密码</Label>
                  </div>
                  <Input id="password" type="password" required />
                </div>
                <Button type="submit" className="w-full">
                  注册
                </Button>
              </div>
              <div className="text-center text-sm">
                已有账号，请&nbsp;
                <a href="/login" className="underline underline-offset-4">
                  登录
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        注册即表明同意我们的 <a href='/tos'>服务条款</a> <br/>
        &copy; Rotriw 2025. Some rights reserved.
      </div>
    </div>
  )
}
