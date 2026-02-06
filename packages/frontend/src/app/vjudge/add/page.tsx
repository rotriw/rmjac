"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { postBind } from "@/api/server/api_vjudge_bind" // Changed import
import { getServices, AvailableService, PlatformInfo, PlatformMethodInfo } from "@/api/server/api_vjudge_services"
import { BindAccountReq } from "@rmjac/api-declare" // New import for type
import {
  Loader2,
  CheckCircle2,
  AlertCircle,
  ChevronRight,
  ChevronLeft,
  ShieldCheck,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { TitleCard, StandardCard } from "@/components/card/card"
import { Badge } from "@/components/ui/badge"
import { TreeTable, TreeTableNode } from "@/components/table/treetable"
import { oklch2hex } from 'colorizr'
import { RECORD_STATUS_COLOR_MAP_INTER } from "@/api-components/record/index"

/*
  stable: 0 - 稳定。通常来源可靠的API或官方支持。
  1 - 一般而言。通常来自较为可靠的API，该网站通常可信。但并非官方。
  2 - 较不稳定。实现方法并不是非常优雅，但通常不会因为网站改版而失效。
  3 - 不稳定。实现方法较为勉强，可能会因为网站改版而失效。
*/

interface RequireField {
  id: string;
  name: string;
  type: string;
  placeholder: string;
}

interface AllowMethod {
  name: string;
  description: string;
  stable: number;
  require_fields: RequireField[];
  tips?: string[];
  is_pwd?: boolean;
  payload_template: string;
}

interface Platform {
  name: string;
  url: string;
  color: string;
  allow_method: AllowMethod[];
}

function ShowStableStatus(stable: number) {
  switch (stable) {
    case 0:
      return <Badge variant="default" className="bg-green-100 text-neutral-800 text-[10px] h-5">稳定性 | 稳定</Badge>
    case 1:
      return <Badge variant="default" className="bg-yellow-100 text-neutral-800 text-[10px] h-5">稳定性 | 1</Badge>
    case 2:
      return <Badge variant="default" className="bg-red-100 text-neutral-800 text-[10px] h-5">稳定性 | 2</Badge>
    case 3:
      return <Badge variant="default" className="bg-gray-100 text-neutral-800 text-[10px] h-5">稳定性 | 3</Badge>
    default:
      return <Badge variant="default" className="bg-gray-100 text-neutral-800 text-[10px] h-5">稳定性 | Unknown</Badge>
  }
}

function resolveRemoteMethod(method: AllowMethod) {
  const name = method.name.toLowerCase()
  if (name === "cookie") return "token"
  return name
}

function buildPayloadFromTemplate(template: string, fields: Record<string, string>) {
  const escaped = template.replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = fields[key] ?? ""
    return value.replace(/\\/g, "\\\\").replace(/"/g, "\\\"")
  })
  return JSON.parse(escaped)
}

export default function AddVJudgeAccountPage() {
  const router = useRouter()
  const [step, setStep] = useState(1)
  const [selectedPlatform, setSelectedPlatform] = useState<string | null>(null)
  const [selectedMethod, setSelectedMethod] = useState<AllowMethod | null>(null)
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({})
  
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState(false)
  const [availableServices, setAvailableServices] = useState<AvailableService[]>([])
  const [platforms, setPlatforms] = useState<Platform[]>([])
  const [servicesLoaded, setServicesLoaded] = useState(false)

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const res = await getServices()
        if (res?.data) {
          setAvailableServices(res.data.services || [])
          const platformData = (res.data.platforms || []) as PlatformInfo[]
          const normalized = platformData.map((platform) => ({
            name: platform.name,
            url: platform.url,
            color: platform.color || oklch2hex([0.86, 0.06, 259]),
            allow_method: platform.allow_method as PlatformMethodInfo[],
          }))
          setPlatforms(normalized)
        }
      } catch (err) {
        console.warn("Failed to fetch vjudge services", err)
      } finally {
        setServicesLoaded(true)
      }
    }

    fetchServices()
  }, [])

  const handleBind = async () => {
    if (!selectedPlatform || !selectedMethod) return
    
    setLoading(true)
    setError("")
    try {
      const payload = buildPayloadFromTemplate(selectedMethod.payload_template, fieldValues)

      const bindAccountReq: BindAccountReq = {
        platform: selectedPlatform,
        method: payload.method,
        auth: payload.auth,
        iden: payload.handle,
        bypass_check: false,
      }

      const res = await postBind({ data: bindAccountReq }) // Changed API call and payload

      if (res.code === 0) { // Assuming res.code is still valid
        setSuccess(true)
        setTimeout(() => {
          router.push(`/vjudge/manage/${res.data.node_id}`) // Assuming res.data contains node_id
          router.refresh()
        }, 2000)
      } else {
        setError(res.msg || "绑定失败")
      }
    } catch (err: unknown) {
      const error = err as Error
      setError(error.message || "发生未知错误")
    } finally {
      setLoading(false)
    }
  }

  const availableSet = useMemo(() => {
    if (!servicesLoaded || availableServices.length === 0) return null
    return new Set(
      availableServices.map((service) =>
        `${service.platform.toLowerCase()}:${service.operation}:${(service.method || "").toLowerCase()}`
      )
    )
  }, [availableServices, servicesLoaded])

  const availablePlatforms = useMemo(() => {
    if (!servicesLoaded || availableServices.length === 0) return null
    return new Set(availableServices.map((service) => service.platform.toLowerCase()))
  }, [availableServices, servicesLoaded])

  useEffect(() => {
    if (!availablePlatforms) return
    if (selectedPlatform && !availablePlatforms.has(selectedPlatform.toLowerCase())) {
      setSelectedPlatform(null)
      setSelectedMethod(null)
      setFieldValues({})
      setStep(1)
    }
  }, [availablePlatforms, selectedPlatform])

  const treeData: TreeTableNode[] = platforms
    .filter((platform) => {
      if (!availablePlatforms) return true
      return availablePlatforms.has(platform.name.toLowerCase())
    })
    .map((platform) => ({
    id: platform.name,
    content_title: platform.name,
    content: <div className="text-xs font-bold">{platform.url}</div>,
    background: platform.color,
    defaultExpanded: true,
    children: platform.allow_method
      .filter((method) => {
        if (!availableSet) return true
        const methodKey = `${platform.name.toLowerCase()}:verify:${resolveRemoteMethod(method)}`
        return availableSet.has(methodKey)
      })
      .map((method) => {
      const isSelected = selectedPlatform === platform.name && selectedMethod?.name === method.name;
      return {
        id: `${platform.name}-${method.name}`,
        content_title: method.name,
        background: isSelected ? RECORD_STATUS_COLOR_MAP_INTER["Accepted"] : undefined,
        content: (
          <div
            className={cn(
              "flex items-center justify-between w-full cursor-pointer py-1",
              isSelected ? "font-bold text-primary" : ""
            )}
            onClick={() => {
              setSelectedPlatform(platform.name)
              setSelectedMethod(method)
            }}
          >
            <div className="text-xs text-muted-foreground">{method.description}</div>
            <div className="flex items-center gap-2">
              {ShowStableStatus(method.stable)}
              {isSelected && <CheckCircle2 className="w-4 h-4 text-green-500" />}
            </div>
          </div>
        )
      };
    })
  }))

  return (
    <div className="py-6 px-4 md:px-6 animate-in fade-in duration-300 max-w-4xl min-w-xl mx-auto">
      <div className="mb-6">
        <TitleCard
          title="绑定新账号"
          description="通过绑定外部平台账号，您可以直接在 Rmjac 提交题目。"
        />
      </div>

      <StandardCard title="" childrenClassName="p-5">
        <div className="flex flex-col">
          <div className="flex items-center gap-2 mb-6">
            <div className="flex items-center gap-2">
              <Badge variant={step === 1 ? "default" : "outline"} className="rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px]">1</Badge>
              <span className={cn("text-xs font-medium", step === 1 ? "text-primary" : "text-muted-foreground")}>选择平台</span>
            </div>
            <div className="w-8 h-[1px] bg-muted" />
            <div className="flex items-center gap-2">
              <Badge variant={step === 2 ? "default" : "outline"} className="rounded-full w-5 h-5 p-0 flex items-center justify-center text-[10px]">2</Badge>
              <span className={cn("text-xs font-medium", step === 2 ? "text-primary" : "text-muted-foreground")}>填写凭据</span>
            </div>
          </div>

          {step === 1 ? (
            <div className="space-y-4 animate-in slide-in-from-left-4 duration-300 flex-1 flex flex-col">
              <TreeTable data={treeData} />
              <div className="mt-auto pt-6 flex justify-end">
                <Button 
                  disabled={!selectedMethod} 
                  onClick={() => setStep(2)}
                >
                  下一步 <ChevronRight className="ml-2 w-4 h-4" />
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
              <div className="space-y-4">
                {selectedMethod?.require_fields.map((field) => (
                  <div key={field.id} className="space-y-2">
                    <Label htmlFor={field.id}>{field.name}</Label>
                    <Input
                      id={field.id}
                      type={field.type}
                      placeholder={field.placeholder}
                      value={fieldValues[field.id] || ""}
                      onChange={(e) => setFieldValues(prev => ({ ...prev, [field.id]: e.target.value }))}
                    />
                  </div>
                ))}
                
                {selectedMethod?.tips && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>提示</AlertTitle>
                    <AlertDescription>
                      <ul className="list-disc list-inside text-xs">
                        {selectedMethod.tips.map((tip, i) => (
                          <li key={i}>{tip}</li>
                        ))}
                      </ul>
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>错误</AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              {success && (
                <Alert className="border-green-500 bg-green-50 text-green-700">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <AlertTitle>成功</AlertTitle>
                  <AlertDescription>账号绑定成功！正在跳转...</AlertDescription>
                </Alert>
              )}

              <div className="mt-auto pt-6 flex justify-between">
                <Button variant="outline" onClick={() => setStep(1)} disabled={loading}>
                  <ChevronLeft className="mr-2 w-4 h-4" /> 上一步
                </Button>
                <Button onClick={handleBind} disabled={loading || success}>
                  {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
                  立即绑定
                </Button>
              </div>
            </div>
          )}
        </div>
      </StandardCard>
    </div>
  )
}

