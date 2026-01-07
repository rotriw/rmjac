import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { redirect } from "next/navigation"
import { API_BASE_URL } from "@/api/client/config"
import { cookies } from "next/headers"

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<"div">) {
  async function handleSubmit(data: FormData) {
    "use server"
    console.log(data.get("user"));
    console.log(JSON.stringify({
      user: data.get("user"),
      password: data.get("password"),
    }));
    const body = await fetch(`${API_BASE_URL}/api/user/login/normal`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: data.get("user"),
          password: data.get("password"),
          long_token: null
        })
      }
    );
    console.log(body.status);
    const res = await body.json();
    console.log(res);
    if (res?.code == 60003) {
      redirect('/login?err=60003')
    }
    if (res?.code == 0) {
      console.log(123);
      // login successful
      // set cookie.
      const cookieStore = await cookies();
      cookieStore.set('_uid', res?.data.user_id);
      cookieStore.set('token', res?.data.token_private?.token);
      redirect('/')
    }
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
