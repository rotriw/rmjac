"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { bindVJudgeAccount } from "@/lib/api"
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  Globe,
  ShieldCheck,
  KeyRound
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TitleCard, StandardCard } from "@/components/card/card"

const PLATFORMS = [
  { id: "Codeforces", name: "Codeforces", icon: Globe },
  { id: "AtCoder", name: "AtCoder", icon: Globe },
  { id: "POJ", name: "POJ", icon: Globe },
  { id: "HDU", name: "HDU", icon: Globe },
]

const REMOTE_MODES = [
  { id: 1, name: "OnlySubmit", description: "仅用于提交题目，不同步代码。" },
  { id: 2, name: "SyncCode", description: "提交题目并尝试同步代码到本地。" },
  { id: 3, name: "FullManaged", description: "完全托管模式。" },
]

export default function AddVJudgeAccountPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    platform: "",
    remote_mode: 2,
    handle: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)

  const nextStep = () => setStep(s => s + 1)
  const prevStep = () => setStep(s => s - 1)

  const handleBind = async () => {
    setLoading(true)
    setError("")
    try {
      const authPayload = JSON.stringify({ 
        handle: formData.handle, 
        password: formData.password 
      })

      const res = await bindVJudgeAccount({
        platform: formData.platform,
        remote_mode: formData.remote_mode,
        auth: { Password: authPayload },
        bypass_check: false,
      })

      if (res.code === 0) {
        setSuccess(true)
        setTimeout(() => {
          router.push(`/vjudge/manage/${res.data.node_id}`)
          router.refresh()
        }, 2000)
      } else {
        setError(res.msg || "绑定失败")
      }
    } catch (err: unknown) {
      const error = err as Error;
      setError(error.message || "发生未知错误")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="py-6 px-4 md:px-6 animate-in fade-in duration-300">
      <div className="mb-6">
        <TitleCard
          title="绑定新账号"
          description="通过绑定外部平台账号，您可以直接在 Rmjac 提交题目。"
        />
      </div>

      {/* Progress Steps */}
      <div className="flex items-center justify-between mb-6 max-w-md">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-center flex-1 last:flex-none">
            <div className={cn(
              "size-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors",
              step === i ? "border-primary bg-primary text-primary-foreground" :
              step > i ? "border-primary bg-primary/10 text-primary" : "border-muted text-muted-foreground"
            )}>
              {step > i ? <CheckCircle2 className="size-4" /> : i}
            </div>
            {i < 3 && (
              <div className={cn(
                "h-0.5 flex-1 mx-2 transition-colors",
                step > i ? "bg-primary" : "bg-muted"
              )} />
            )}
          </div>
        ))}
      </div>

      <StandardCard
        title={
          step === 1 ? "第一步：选择平台" :
          step === 2 ? "第二步：选择绑定类型" :
          "第三步：填写账号信息"
        }
        className="max-w-2xl"
      >
        <div className="min-h-[200px] flex flex-col">
          {step === 1 && (
            <div className="grid grid-cols-2 gap-4">
              {PLATFORMS.map((p) => (
                <button
                  key={p.id}
                  onClick={() => {
                    setFormData({ ...formData, platform: p.id })
                    nextStep()
                  }}
                  className={cn(
                    "flex flex-col items-center justify-center p-6 rounded-xl border-2 transition-all hover:border-primary hover:bg-primary/5 group",
                    formData.platform === p.id ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <p.icon className={cn(
                    "size-10 mb-3 transition-colors",
                    formData.platform === p.id ? "text-primary" : "text-muted-foreground group-hover:text-primary"
                  )} />
                  <span className="font-semibold">{p.name}</span>
                </button>
              ))}
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              {REMOTE_MODES.map((m) => (
                <button
                  key={m.id}
                  onClick={() => setFormData({ ...formData, remote_mode: m.id })}
                  className={cn(
                    "w-full flex items-start gap-4 p-4 rounded-xl border-2 text-left transition-all hover:border-primary hover:bg-primary/5",
                    formData.remote_mode === m.id ? "border-primary bg-primary/5" : "border-muted"
                  )}
                >
                  <div className={cn(
                    "mt-1 p-2 rounded-lg",
                    formData.remote_mode === m.id ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  )}>
                    <ShieldCheck className="size-5" />
                  </div>
                  <div>
                    <div className="font-bold">{m.name}</div>
                    <div className="text-sm text-muted-foreground">{m.description}</div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="handle">Handle / 用户名</Label>
                <div className="relative">
                  <Globe className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input 
                    id="handle" 
                    placeholder="输入您的平台用户名" 
                    className="pl-10"
                    value={formData.handle}
                    onChange={(e) => setFormData({ ...formData, handle: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密码 / Token</Label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-3 size-4 text-muted-foreground" />
                  <Input 
                    id="password" 
                    type="password"
                    placeholder="输入您的登录密码或 API Token" 
                    className="pl-10"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>绑定失败</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="bg-green-50 text-green-900 border-green-200">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                  <AlertTitle>绑定成功</AlertTitle>
                  <AlertDescription>正在为您跳转到管理页面...</AlertDescription>
                </Alert>
              )}
            </div>
          )}
        </div>
        <div className="flex justify-between border-t border-dashed mt-6 pt-6">
          <Button
            variant="outline"
            size="sm"
            onClick={prevStep}
            disabled={step === 1 || loading || success}
            className="h-8 text-xs"
          >
            <ChevronLeft className="mr-2 size-3" /> 上一步
          </Button>
          
          {step < 3 ? (
            <Button 
              size="sm"
              onClick={nextStep} 
              disabled={step === 1 && !formData.platform}
              className="h-8 text-xs"
            >
              下一步 <ChevronRight className="ml-2 size-3" />
            </Button>
          ) : (
            <Button 
              size="sm"
              onClick={handleBind} 
              disabled={loading || success || !formData.handle || !formData.password}
              className="h-8 text-xs min-w-[100px]"
            >
              {loading ? (
                <><Loader2 className="mr-2 size-3 animate-spin" /> 绑定中...</>
              ) : (
                "立即绑定"
              )}
            </Button>
          )}
        </div>
      </StandardCard>
    </div>
  )
}
