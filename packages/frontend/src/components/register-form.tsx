import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { CaptchaForm } from "./register-captcha-form"
import { RegisterIdenForm } from "./register-iden-form"
import { redirect } from "next/navigation"
import { getBeforeRegister, postRegister } from "@/api/server/api_user_auth"

// interface RegisterData {
//   name: string;
//   iden: string;
//   email: string;
//   password: string;
//   captcha: string;
//   challenge_verify: string;
//   challenge_time: number;
// }

interface RegisterFormProps extends React.ComponentProps<"div"> {
  searchParams?: { [key: string]: string | string[] | undefined }
}

export async function RegisterForm({
  className,
  searchParams,
  ...props
}: RegisterFormProps) {
  const params = await searchParams;
  console.log(233);
  const data: {
    challenge_code: string,
    challenge_verify: string,
    challenge_time: number,
  } = (params?.email) ? await getBeforeRegister({ dark_mode: false, email: params.email as string }) : {} as any;
  const now_data = (!params?.email) ? (<>
    <div className="grid gap-3">
      <Label htmlFor="email">邮箱</Label>
      <Input
        name="email"
        id="email"
        type="email"
        placeholder="a@example.com"
        required
      />
    </div>
    <Button type="submit" className="w-full">
      下一步
    </Button>
  </>) : (<>
    <div className="grid gap-3">
      <Label htmlFor="email">邮箱</Label>
      <Input
        name="email"
        id="email"
        type="email"
        placeholder="a@example.com"
        required
        readOnly
        value={params.email}
      />
    </div>
    <RegisterIdenForm iden={params?.iden as string} />
    <div className="grid gap-3">
      <Label htmlFor="user">昵称</Label>
      <Input
        name="nickname"
        id="nickname"
        type="user"
        placeholder=""
        required
      />
      <Label htmlFor="user" className="text-xs text-muted-foreground">
        请勿在昵称中包含敏感信息或违反社区规范的内容。昵称长度为 1-20 个字符。
      </Label>
    </div>
    <div className="grid gap-3">
      <Label htmlFor="password">密码</Label>
      <Input
        name="password"
        id="password"
        type="password"
        placeholder="请输入密码"
        required
      />
      <Label htmlFor="password" className="text-xs text-muted-foreground">
        密码长度为 6-20 个字符，建议包含字母、数字和特殊字符。
      </Label>
      </div>
    <CaptchaForm defaultChallengeCode={data.challenge_code}
      challengeVerify={data.challenge_verify}
      challengeTime={data.challenge_time}
      email={params.email as string} />
    {searchParams?.err === "iden_exist" ? <Label className="text-xs text-red-500">用户名已存在，请更换用户名。</Label> : ""}
    {searchParams?.err === "captcha_invalid" ? <Label className="text-xs text-red-500">验证码无效，请重新输入。</Label> : ""}
    {searchParams?.err === "captcha_expired" ? <Label className="text-xs text-red-500">验证码已过期，请刷新验证码。</Label> : ""}
    {searchParams?.err === "register_failed" ? <Label className="text-xs text-red-500">注册失败： {searchParams?.msg}。</Label> : ""}
    <div className="grid gap-3">
      <div className="grid grid-cols-4 gap-3">
        <a href="/register"><Button type="button" variant="outline" className="col-span-1">
          上一步
        </Button></a>
        <Button type="submit" className="col-span-3">
          注册
        </Button>
      </div>
    </div>
  </>);
  async function handleSubmit(data: FormData) {
    'use server'
    console.log(JSON.stringify({
      name: data.get("nickname"),
      iden: data.get("username"),
      email: data.get("email"),
      password: data.get("password"),
      avatar: "",
        challenge_text: data.get("captcha"),
        challenge_code: data.get("challenge_verify"),
        challenge_time: +(data.get("challenge_time") || 0),
        challenge_darkmode: "light",
    }));
    try {
      await postRegister({
      name: data.get("nickname") as string,
      iden: data.get("username") as string,
      email: data.get("email") as string,
      password: data.get("password") as string,
      avatar: "",
      verify: {
        challenge_text: data.get("captcha") as string,
        challenge_code: data.get("challenge_verify") as string,
        challenge_time: +(data.get("challenge_time") || 0),
        challenge_darkmode: "false",
      }})
    } catch (error: unknown) {
      console.log(error);
      const message = error instanceof Error ? error.message : ""
      if (message.includes("IDEN") || message.includes("exists")) {
        redirect(`/register?email=${data.get("email")}&err=iden_exist`)
      }
      if (message.includes("Invalid captcha")) {
        redirect(`/register?email=${data.get("email")}&err=captcha_invalid`)
      }
      if (message.includes("Captcha is expired")) {
        redirect(`/register?email=${data.get("email")}&err=captcha_expired`)
      }
      redirect(`/register?email=${data.get("email")}&err=register_failed&msg=${encodeURIComponent(message)}`)
    }

      redirect('/register/success?email=' + data.get("email"))
  }
  if (params?.email) {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardContent className="duration-300">
            <form action={handleSubmit}>
              <div className="grid gap-6">
                <div className="grid gap-6">
                  {now_data}
                  <div className="text-center text-sm">
                    已有账号，请&nbsp;
                    <a href="/login" className="underline underline-offset-4">
                      登录
                    </a>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
          注册即表明同意我们的 <a href='/tos'>服务条款</a> <br />
          &copy; Rotriw 2025. Some rights reserved.
        </div>
      </div>
    )
  } else {
    return (
      <div className={cn("flex flex-col gap-6", className)} {...props}>
        <Card>
          <CardContent className="duration-300">
            <form>
              <div className="grid gap-6">
                <div className="grid gap-6">
                  {now_data}
                  <div className="text-center text-sm">
                    已有账号，请&nbsp;
                    <a href="/login" className="underline underline-offset-4">
                      登录
                    </a>
                  </div>
                </div>
              </div>
            </form>
          </CardContent>
        </Card>
        <div className="text-muted-foreground *:[a]:hover:text-primary text-center text-xs text-balance *:[a]:underline *:[a]:underline-offset-4">
          注册即表明同意我们的 <a href='/tos'>服务条款</a> <br />
          &copy; Rotriw 2025. Some rights reserved.
        </div>
      </div>
    )
  }
}
