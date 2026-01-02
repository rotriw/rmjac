"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectItem } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { bindVJudgeAccount, VJudgeAccount } from "@/api/server/vjudge"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { StandardCard } from "@/components/card/card"

interface AddAccountFormProps {
    onSuccess?: (account: VJudgeAccount) => void
}

export function AddAccountForm({ onSuccess }: AddAccountFormProps) {
  const [platform, setPlatform] = useState<string>("")
  const [handle, setHandle] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState("")

  const platforms = ["Codeforces", "AtCoder"]

  const handleBind = async () => {
    if (!platform || !handle) {
      setMessage("请选择平台并输入 Handle")
      setStatus('error')
      return
    }

    setLoading(true)
    setStatus('verifying')
    setMessage("正在绑定账号...")

    try {
      // Pack handle and password into auth.Password for now since backend doesn't have dedicated handle field
      // Format: JSON string
      const authPayload = JSON.stringify({ handle, password });

      const res = await bindVJudgeAccount({
          platform: platform,
          remote_mode: 2, // Default to SyncCode (2) or similar? Let's assume 2 for now.
          auth: { Password: authPayload },
          bypass_check: false,
          // ws_id: ... // We need socket ID for verification feedback? 
          // For now, let's omit ws_id or we need to get it from a context.
      })
      
      if (res.code === 0) {
          setStatus('success')
          setMessage("账号绑定请求已提交。请稍后查看验证状态。")
          if (onSuccess) {
              onSuccess(res.data)
          }
      } else {
          throw new Error(res.msg || "绑定失败")
      }

    } catch (error: any) {
      setStatus('error')
      setMessage(error.message || "发生未知错误")
    } finally {
      setLoading(false)
    }
  }

  return (
    <StandardCard title="绑定新账号" className="w-full mx-auto">
      <div className="space-y-4 pt-1">
        <div className="text-sm text-muted-foreground mb-4">
            请输入您的 Vjudge 账号信息以进行绑定。
        </div>

        <div className="space-y-1">
          <Label htmlFor="platform">平台</Label>
          <Select 
            value={platform} 
            onChange={(e) => setPlatform(e.target.value)}
            id="platform"
          >
            <option value="" disabled>选择平台</option>
            {platforms.map((p) => (
              <SelectItem key={p} value={p}>{p}</SelectItem>
            ))}
          </Select>
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="handle">Handle / 用户名</Label>
          <Input 
            id="handle" 
            placeholder="输入您的 Handle" 
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="password">密码 / Token</Label>
          <Input 
            id="password" 
            type="password"
            placeholder="输入您的密码或 Token" 
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        {status === 'error' && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>错误</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}
        
        {status === 'success' && (
          <Alert className="bg-green-50 text-green-900 border-green-200">
            <CheckCircle2 className="h-4 w-4 text-green-600" />
            <AlertTitle>成功</AlertTitle>
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        <div className="pt-2">
            <Button 
            className="" 
            onClick={handleBind} 
            disabled={loading || status === 'success'}
            >
            {loading ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在绑定...
                </>
            ) : (
                "绑定账号"
            )}
            </Button>
        </div>
      </div>
    </StandardCard>
  )
}
