"use client"

import { useEffect, useState } from "react"
import { StandardCard } from "@/components/card/card"
import { Input } from "@/components/ui/input"
import { getMyAccounts } from "@/api/server/api_vjudge_my_accounts"
import { postExecuteTask, getWorkflowServices } from "@/api/server/api_vjudge_workflow"
import {
  VjudgeNode,
  WorkflowServiceInfo,
  WorkflowValueDTO,
} from "@rmjac/api-declare"
import { socket } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Loader2, ArrowLeft } from "lucide-react"

/** 将 key 转为用户友好的标签 */
function keyToLabel(key: string): string {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

/** 判断 key 是否应该用密码输入框 */
function isSecretKey(key: string): boolean {
  const lower = key.toLowerCase()
  return (
    lower.includes("secret") ||
    lower.includes("password") ||
    lower.includes("token") ||
    lower.includes("pwd")
  )
}

const AUTO_FILL_KEYS = new Set([
  "platform",
  "account_id",
  "handle",
  "iden",
  "method",
  "user_id",
])

type WorkflowValueInput = WorkflowValueDTO

function getAutoFillValues(
  account: VjudgeNode | undefined,
  serviceName: string | null
): Record<string, WorkflowValueInput> {
  if (!account || !serviceName) return {}

  const parts = serviceName.split(":")
  const method = parts[2] ?? ""
  const values: Record<string, WorkflowValueInput> = {
    platform: { type: "String", value: account.public.platform },
    account_id: { type: "String", value: account.node_id.toString() },
    handle: { type: "String", value: account.public.iden },
    iden: { type: "String", value: account.public.iden },
  }

  if (method) {
    values.method = { type: "String", value: method }
  }

  return values
}

export function AddTaskCard() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<VjudgeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)

  // 工作流服务
  const [services, setServices] = useState<WorkflowServiceInfo[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [selectedService, setSelectedService] = useState<string | null>(null)

  // 动态输入字段: key -> value
  const [inputValues, setInputValues] = useState<Record<string, string>>({})

  useEffect(() => {
    getMyAccounts()
      .then((resp) => setAccounts(resp.data || []))
      .catch(console.error)

    setServicesLoading(true)
    getWorkflowServices()
      .then((resp) => setServices(resp.data || []))
      .catch(console.error)
      .finally(() => setServicesLoading(false))
  }, [])

  const account = accounts.find(
    (acc) => acc.node_id.toString() === selectedAccount
  )
  const platform = account?.public.platform?.toLowerCase()

  // 筛选与当前账号平台匹配的服务
  const availableServices = services.filter(
    (svc) => !platform || svc.platform.toLowerCase() === platform
  )

  const selectedSvc = services.find((s) => s.name === selectedService)

  // 从 import_require 中获取 requiredKeys
  const allRequiredKeys: string[] =
    selectedSvc?.import_require?.requiredKeys ?? []
  const userInputKeys = allRequiredKeys.filter((key) => !AUTO_FILL_KEYS.has(key))

  // 切换服务时重置输入
  const handleSelectService = (name: string) => {
    setSelectedService(name)
    setInputValues({})
  }

  // 检查所有必填项是否已填（仅用户需要输入的字段）
  const allFilled =
    userInputKeys.length === 0 ||
    userInputKeys.every((k) => inputValues[k]?.trim())

  const handleSubmit = async () => {
    if (!selectedAccount || !selectedService) {
      toast.error("请选择账号和服务")
      return
    }

    // 检查必填字段（仅用户输入字段）
    const missing = userInputKeys.filter((k) => !inputValues[k]?.trim())
    if (missing.length > 0) {
      toast.error(`请填写: ${missing.map(keyToLabel).join(", ")}`)
      return
    }

    // 构建 values 对象
    const autoValues = getAutoFillValues(account, selectedService)
    const userValues: Record<string, WorkflowValueInput> = {}
    for (const key of userInputKeys) {
      userValues[key] = { type: "String", value: inputValues[key]?.trim() || "" }
    }
    const values: Record<string, WorkflowValueInput> = {
      ...autoValues,
      ...userValues,
    }

    setLoading(true)
    try {
      const res = await postExecuteTask({
        body: {
          service_name: selectedService,
          input: {
            statusType: "Initial",
            values,
          },
          ws_id: socket.id ?? null,
          vjudge_node_id: +(selectedAccount),
          timeout_ms: +(60000),
        },
      })

      const taskId = res.data.task_id
      if (taskId) {
        toast.success("工单已创建")
        router.push(`/vjudge/task/${taskId}`)
      } else {
        toast.success("任务已提交")
        router.push("/vjudge/task")
      }
    } catch (e) {
      console.error(e)
      toast.error("提交失败")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <Button
        variant="ghost"
        size="sm"
        onClick={() => router.push("/vjudge/task")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        返回列表
      </Button>

      <StandardCard title="创建工单">
        <div className="space-y-6">
          {accounts.length === 0 ? (
            <div className="p-4 border rounded-lg bg-destructive/10 text-destructive text-sm">
              暂无绑定的 VJudge 账号，无法创建工单。
              <div className="mt-2">
                <Link
                  href="/vjudge/account"
                  className="text-blue-600 hover:underline"
                >
                  前往管理账号绑定
                </Link>
              </div>
            </div>
          ) : (
            <>
              {/* 1. 选择账号 */}
              <div className="space-y-2">
                <label className="text-sm font-medium">1. 选择账号</label>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((acc) => {
                    const accountId = acc.node_id.toString()
                    const isSelected = selectedAccount === accountId
                    return (
                      <Badge
                        key={accountId}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer py-1.5 px-3 text-xs transition-all",
                          isSelected ? "shadow-sm" : "hover:bg-muted"
                        )}
                        onClick={() => {
                          setSelectedAccount(accountId)
                          setSelectedService(null)
                          setInputValues({})
                        }}
                      >
                        {acc.public.platform}: {acc.public.iden}
                      </Badge>
                    )
                  })}
                </div>
              </div>

              {/* 2. 选择工作流服务 */}
              {selectedAccount && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <label className="text-sm font-medium">2. 选择服务</label>
                  {servicesLoading ? (
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      加载服务列表...
                    </div>
                  ) : availableServices.length === 0 ? (
                    <div className="text-xs text-yellow-600 p-2 border rounded bg-yellow-50">
                      当前平台无可用服务
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {availableServices.map((svc) => {
                        const isSelected = selectedService === svc.name
                        return (
                          <Badge
                            key={svc.name}
                            variant={isSelected ? "default" : "outline"}
                            className={cn(
                              "cursor-pointer py-1.5 px-3 text-xs transition-all",
                              isSelected
                                ? "shadow-sm bg-indigo-600 hover:bg-indigo-700"
                                : "hover:bg-muted",
                              svc.available_sockets === 0 && "opacity-50"
                            )}
                            onClick={() => handleSelectService(svc.name)}
                          >
                            {svc.operation}
                            {svc.method ? `:${svc.method}` : ""}
                            <span className="ml-1 opacity-60">
                              ({svc.available_sockets})
                            </span>
                          </Badge>
                        )
                      })}
                    </div>
                  )}
                  {selectedSvc && (
                    <p className="text-[10px] text-muted-foreground ml-1">
                      {selectedSvc.allow_description || selectedSvc.description || `${selectedSvc.platform}:${selectedSvc.operation}`}
                    </p>
                  )}
                </div>
              )}

              {/* 3. 动态输入字段 - 根据 import_require.requiredKeys 生成 */}
              {selectedService && userInputKeys.length > 0 && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-1 duration-300">
                  <label className="text-sm font-medium">3. 填写参数</label>
                  <div className="space-y-3">
                    {userInputKeys.map((key) => (
                      <div key={key} className="space-y-1">
                        <span className="text-[11px] text-muted-foreground font-medium">
                          {keyToLabel(key)}
                          <span className="text-red-400 ml-0.5">*</span>
                        </span>
                        <Input
                          type={isSecretKey(key) ? "password" : "text"}
                          value={inputValues[key] || ""}
                          onChange={(e) =>
                            setInputValues((prev) => ({
                              ...prev,
                              [key]: e.target.value,
                            }))
                          }
                          placeholder={key}
                          className="h-8 text-xs"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 无需额外参数时的提示 */}
              {selectedService && userInputKeys.length === 0 && (
                <div className="text-xs text-muted-foreground p-2 border rounded bg-muted/30 animate-in fade-in slide-in-from-top-1 duration-300">
                  该服务无需额外参数，直接提交即可。
                </div>
              )}

              {/* 提交 */}
              <Button
                onClick={handleSubmit}
                disabled={loading || !selectedAccount || !selectedService || !allFilled}
                className="w-full bg-indigo-600 hover:bg-indigo-700"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                    提交中...
                  </>
                ) : (
                  "创建工单"
                )}
              </Button>
            </>
          )}
        </div>
      </StandardCard>
    </div>
  )
}
