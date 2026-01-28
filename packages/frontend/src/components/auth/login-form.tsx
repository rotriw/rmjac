import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { redirect } from "next/navigation"
import { cookies } from "next/headers"
import { postLogin } from "@/api/server/api_user_auth"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  async function handleSubmit(data: FormData) {
    "use server"
    try {
      const res = await postLogin({
        
        user: data.get("user") as string,
        password: data.get("password") as string,
      })

      const cookieStore = await cookies()
      cookieStore.set('_uid', String(res.user_id))
      cookieStore.set('token', res.token.private.token)
    } catch (_error) {
      redirect(`/login?err=login_failed&reason=${_error}`)
    }
    redirect('/')
    
  }
  return (
    <div className={cn("flex flex-col gap-6", className)} {...props}>
      <Card>
        <CardContent>
          <form action={handleSubmit}>
            <div className="grid gap-6">
              <div className="grid gap-6">
                <div className="grid gap-3">
                  <Label htmlFor="name">Email/Handle</Label>
                  <Input
                    name="user"
                    id="user"
                    type="user"
                    placeholder="you@rmj.ac"
                    required
                  />
                </div>
                <div className="grid gap-3">
                  <div className="flex items-center">
                    <Label htmlFor="password">Password</Label>
                    <a
                      href="#"
                      className="ml-auto text-sm underline-offset-4 hover:underline"
                    >
                      Forgot your password?
                    </a>
                  </div>
                  <Input name="password" id="password" type="password" required />
                </div>
                <Button type="submit" className="w-full">
                  Login
                </Button>
              </div>
              <div className="text-center text-sm">
                没有账号，请&nbsp;
                <a href="/register" className="underline underline-offset-4">
                  注册
                </a>
              </div>
            </div>
          </form>
        </CardContent>
      </Card>
      <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
        &copy; Rotriw. All rights reserved.
      </div>
    </div>
  )
}
