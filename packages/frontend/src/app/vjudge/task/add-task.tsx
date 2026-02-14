"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { socket } from "@/lib/socket"
import { getMyAccounts } from "@/api/server/api_vjudge_my_accounts"
import { getWorkflowServices, postExecuteTask } from "@/api/server/api_vjudge_workflow"
import { postServiceRequire } from "@/api/server/api_vjudge_services"
import { Button } from "@/components/ui/button"
import { StandardCard } from "@/components/card/card"
import { Select, SelectItem } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Loader2 } from "lucide-react"
import { useAuth } from "@/contexts/auth-context"
import type { VjudgeNode, WorkflowRequire, WorkflowServiceInfo, WorkflowValueDTO } from "@rmjac/api-declare"

interface RequireField {
  key: string
  fixedValue?: string
}

interface RequireParseResult {
  fields: RequireField[]
  notes: string[]
}

const REQUIRE_KEY_REGEX = /Must have key '([^']+)'/
const REQUIRE_EQ_REGEX = /Key '([^']+)' must be '([^']+)'/

function parseInputRequire(input: string): RequireParseResult {
  if (!input) return { fields: [], notes: [] }

  const fields = new Map<string, RequireField>()
  const notes: string[] = []
  const chunks = input
    .split(/;\s*\n?/)
    .map((item) => item.trim())
    .filter(Boolean)

  chunks.forEach((chunk) => {
    const eqMatch = chunk.match(REQUIRE_EQ_REGEX)
    if (eqMatch) {
      const key = eqMatch[1]
      const value = eqMatch[2]
      if (key.startsWith("inner:")) return
      fields.set(key, { key, fixedValue: value })
      return
    }

    const keyMatch = chunk.match(REQUIRE_KEY_REGEX)
    if (keyMatch) {
      const key = keyMatch[1]
      if (key.startsWith("inner:")) return
      if (!fields.has(key)) {
        fields.set(key, { key })
      }
      return
    }

    // 复杂表达式无法自动解析，保留为说明
    notes.push(chunk)
  })

  return { fields: Array.from(fields.values()), notes }
}

function toWorkflowValue(value: string): WorkflowValueDTO {
  return { type: "String", value }
}

function getAutoFillValues(
  account: VjudgeNode | undefined,
  serviceName: string | null,
  planStartRequire?: string | null,
  userId?: number | null,
  authToken?: string | null,
): Record<string, WorkflowValueDTO> {
  if (!serviceName) return {}

  const parts = serviceName.split(":")
  const method = parts[2] ?? ""
  const values: Record<string, WorkflowValueDTO> = {}

  if (method) {
    values.method = toWorkflowValue(method)
  }

  if (account) {
    values.platform = toWorkflowValue(account.public.platform)
    values.account_id = toWorkflowValue(account.node_id.toString())
    values.handle = toWorkflowValue(account.public.iden)
    values.iden = toWorkflowValue(account.public.iden)
    values.username = toWorkflowValue(account.public.iden)
  }

  // 当方案起点是 vjudge_from_node_* 时，自动填充 vjudge_id / user_id / token
  if (planStartRequire && planStartRequire.startsWith("vjudge_from_node_")) {
    if (account) {
      values.vjudge_id = toWorkflowValue(account.node_id.toString())
    }
    if (userId) {
      values.user_id = toWorkflowValue(userId.toString())
    }
    if (authToken) {
      values.token = toWorkflowValue(authToken)
    }
  }

  return values
}

export default function VJudgeAddTaskPage() {
  const router = useRouter()
  const { user, token: authToken } = useAuth()
  const [accounts, setAccounts] = useState<VjudgeNode[]>([])
  const [services, setServices] = useState<WorkflowServiceInfo[]>([])
  const [servicesLoading, setServicesLoading] = useState(true)
  const [loading, setLoading] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState("")
  const [selectedService, setSelectedService] = useState("")
  const [requires, setRequires] = useState<WorkflowRequire[]>([])
  const [requiresLoading, setRequiresLoading] = useState(false)
  const [selectedPlanIndex, setSelectedPlanIndex] = useState(0)
  const [inputValues, setInputValues] = useState<Record<string, string>>({})
  const [inputNotes, setInputNotes] = useState<string[]>([])

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

  useEffect(() => {
    if (!selectedService) {
      setRequires([])
      setInputValues({})
      setInputNotes([])
      return
    }

    setRequiresLoading(true)
    postServiceRequire({ service_name: selectedService })
      .then((resp) => {
        setRequires(resp.data || [])
        setSelectedPlanIndex(0)
        setInputValues({})
        setInputNotes([])
      })
      .catch((error) => {
        console.error(error)
        toast.error("获取服务方案失败")
        setRequires([])
      })
      .finally(() => setRequiresLoading(false))
  }, [selectedService])

  const account = accounts.find(
    (acc) => acc.node_id.toString() === selectedAccount
  )

  const plan = requires[selectedPlanIndex]

  const autoValues = useMemo(
    () => getAutoFillValues(
      account,
      selectedService || null,
      plan?.start_require ?? null,
      user?.node_id ?? null,
      authToken,
    ),
    [account, selectedService, plan, user, authToken]
  )

  const { fields: planFields, notes: planNotes } = useMemo(() => {
    if (!plan) return { fields: [], notes: [] }
    return parseInputRequire(plan.input_require)
  }, [plan])

  useEffect(() => {
    setInputNotes(planNotes)
  }, [planNotes])

  const handleValueChange = (key: string, value: string) => {
    setInputValues((prev) => ({ ...prev, [key]: value }))
  }

  const handleSubmit = async () => {
    if (!selectedService) {
      toast.error("请选择服务")
      return
    }

    if (!plan) {
      toast.error("当前服务没有可用方案")
      return
    }

    setLoading(true)
    try {
      const values: Record<string, WorkflowValueDTO> = {}

      // 用户输入的字段
      Object.entries(inputValues).forEach(([key, value]) => {
        if (value !== "") {
          values[key] = toWorkflowValue(value)
        }
      })

      // 自动填充字段（账号/方法）
      Object.entries(autoValues).forEach(([key, value]) => {
        values[key] = value
      })

      // 固定要求字段（如 Key 'x' must be 'y'）
      planFields.forEach((field) => {
        if (field.fixedValue !== undefined) {
          values[field.key] = toWorkflowValue(field.fixedValue)
        }
      })

      const res = await postExecuteTask({
        body: {
          service_name: selectedService,
          input: { values },
          ws_id: socket.id ?? null,
          vjudge_node_id: selectedAccount ? Number(selectedAccount) : null,
          timeout_ms: Number(60000),
        },
      })

      const payload = res as unknown as Record<string, unknown>
      const data = payload.data as { task_id?: number | null } | undefined
      const taskId = data?.task_id ?? res.node_id
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

  const planOptions = requires.map((item, index) => ({
    label: `${item.start_require} → ${selectedService}`,
    value: index.toString(),
  }))

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" onClick={() => router.push("/vjudge/task")}
      >
        <ArrowLeft className="h-4 w-4 mr-1" />
        返回列表
      </Button>

      <StandardCard title="创建同步任务">
        <div className="space-y-4">
          <div className="space-y-1">
            <Label>选择账号（可选）</Label>
            <Select
              value={selectedAccount}
              onValueChange={setSelectedAccount}
              disabled={accounts.length === 0}
            >
              <SelectItem value="" disabled>
                {accounts.length === 0 ? "暂无账号" : "请选择账号"}
              </SelectItem>
              {accounts.map((acc) => (
                <SelectItem key={acc.node_id.toString()} value={acc.node_id.toString()}>
                  {acc.public.platform} · {acc.public.iden}
                </SelectItem>
              ))}
            </Select>
            <div className="text-xs text-muted-foreground">
              未选择账号时，仅提交手动输入字段。
            </div>
        </div>

        <div className="space-y-1">
          <Label>选择服务</Label>
          <Select value={selectedService} onValueChange={setSelectedService}>
            <SelectItem value="" disabled>
              {servicesLoading ? "加载中..." : "请选择服务"}
            </SelectItem>
            {services.map((service) => (
              <SelectItem key={service.name} value={service.name}>
                {service.name}
              </SelectItem>
            ))}
          </Select>
        </div>

            <div className="space-y-1">
              <Label>选择方案</Label>
              <Select
                value={selectedPlanIndex.toString()}
                onValueChange={(value) => setSelectedPlanIndex(Number(value))}
                disabled={!selectedService || requiresLoading || planOptions.length === 0}
              >
                <SelectItem value="" disabled>
                  {requiresLoading ? "加载方案中..." : "请选择方案"}
                </SelectItem>
                {planOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </Select>
              {plan && (
                <div className="text-xs text-muted-foreground space-y-1">
                  <div>起点服务：{plan.start_require}</div>
                  <div>路径说明：{plan.route_describe}</div>
                </div>
              )}
            </div>

            {plan && (
              <div className="space-y-3">
                <div className="text-sm font-medium">输入要求</div>
                {planFields.length === 0 && (
                  <div className="text-xs text-muted-foreground">
                    该方案没有额外输入要求。
                  </div>
                )}
                {planFields.filter((field) => !field.key.startsWith("inner:")).map((field) => {
                  const autoValue = autoValues[field.key]
                  const fixedValue = field.fixedValue
                  const rawValue = fixedValue ?? autoValue?.value ?? inputValues[field.key] ?? ""
                  const value = typeof rawValue === "string" ? rawValue : String(rawValue)
                  const isLocked = fixedValue !== undefined || autoValue !== undefined

                  return (
                    <div key={field.key} className="space-y-1">
                      <Label>{field.key}</Label>
                      <Input
                        value={value}
                        onChange={(e) => handleValueChange(field.key, e.target.value)}
                        disabled={isLocked}
                      />
                      {fixedValue !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          固定要求值：{fixedValue}
                        </div>
                      )}
                      {fixedValue === undefined && autoValue !== undefined && (
                        <div className="text-xs text-muted-foreground">
                          已根据账号自动填充
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {inputNotes.length > 0 && (
              <div className="rounded-md border border-dashed p-3 text-xs text-muted-foreground space-y-1">
                <div className="font-medium text-foreground">附加要求</div>
                {inputNotes.map((note, idx) => (
                  <div key={`${note}-${idx}`}>{note}</div>
                ))}
              </div>
            )}

          <div className="pt-2">
            <Button onClick={handleSubmit} disabled={loading || requiresLoading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  提交中...
                </>
              ) : (
                "创建任务"
              )}
            </Button>
          </div>
        </div>
      </StandardCard>
    </div>
  )
}
