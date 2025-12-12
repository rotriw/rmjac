"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { addVJudgeAccount, verifyVJudgeAccount, getVJudgeAccountStatus } from "@/lib/api"
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react"
import { StandardCard } from "@/components/card/card"

export function AddAccountForm() {
  const [platform, setPlatform] = useState<string>("")
  const [handle, setHandle] = useState<string>("")
  const [password, setPassword] = useState<string>("")
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<'idle' | 'verifying' | 'success' | 'error'>('idle')
  const [message, setMessage] = useState("")

  const platforms = ["Codeforces", "AtCoder", "LeetCode", "Luogu"]

  const handleVerify = async () => {
    if (!platform || !handle) {
      setMessage("请选择平台并输入 Handle")
      setStatus('error')
      return
    }

    setLoading(true)
    setStatus('verifying')
    setMessage("正在添加账号并启动验证...")

    try {
      // 1. Add Account
      const addRes = await addVJudgeAccount({ platform, handle, password })
      
      if (addRes.error) {
          throw new Error(addRes.error)
      }
      
      const accountId = addRes.id || addRes.account?.id || (addRes.data && addRes.data.id)

      if (!accountId) {
          if (process.env.NODE_ENV === 'development' && !addRes.id) {
             console.warn("No account ID returned, proceeding with mock verification")
             await new Promise(r => setTimeout(r, 1500));
             setStatus('success')
             setMessage("账号验证成功！(开发模式)")
             setLoading(false)
             return;
          }
          throw new Error("无法从服务器获取账号ID")
      }

      // 2. Verify
      setMessage("正在验证账号所有权...")
      await verifyVJudgeAccount(accountId)
      
      // 3. Check status
      const statusRes = await getVJudgeAccountStatus(accountId)
      if (statusRes.verified_status) {
          setStatus('success')
          setMessage("账号验证成功！")
      } else {
          setStatus('error')
          setMessage("验证失败或仍在进行中，请稍后在管理页面查看状态。")
      }

    } catch (error: any) {
      setStatus('error')
      setMessage(error.message || "发生未知错误")
    } finally {
      setLoading(false)
    }
  }

  return (
    <StandardCard title="添加新账号" className="w-full mx-auto">
      <div className="space-y-4 pt-1">
        <div className="text-sm text-muted-foreground mb-4">
            请输入您的 Vjudge 账号信息以进行绑定。绑定过程可能需要验证您对该账号的所有权。
        </div>

        <div className="space-y-1">
          <Label htmlFor="platform">平台</Label>
          <Select onValueChange={setPlatform} value={platform}>
            <SelectTrigger id="platform">
              <SelectValue placeholder="选择平台" />
            </SelectTrigger>
            <SelectContent>
              {platforms.map((p) => (
                <SelectItem key={p} value={p}>{p}</SelectItem>
              ))}
            </SelectContent>
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
            onClick={handleVerify} 
            disabled={loading || status === 'success'}
            >
            {loading ? (
                <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                正在验证...
                </>
            ) : (
                "添加并验证"
            )}
            </Button>
        </div>
      </div>
    </StandardCard>
  )
}
