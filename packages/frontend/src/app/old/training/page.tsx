"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { StandardCard, TitleCard } from "@/components/card/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { RightSidebar } from "@/components/layout/right-sidebar"
import { TrainingCard } from "@/api-components/training/training-card"
import { getNormal } from "@/api/client/api_training_list"
import { getViewDirect } from "@/api/client/api_training_view"
import { getUserInfo } from "@/api/client/api_user_info"
import type { Training, TrainingUserEdge, TrainingStatus } from "@rmjac/api-declare"
import { Loader2, PlusCircle, Filter, ListTree, Users, Mail } from "lucide-react"

type TrainingMethod = "owned" | "joined" | "invited" | "pin"

const METHOD_CONFIG: Array<{
  key: TrainingMethod
  title: string
  emptyText: string
}> = [
  {
    key: "pin",
    title: "置顶训练",
    emptyText: "暂无置顶训练",
  },
  {
    key: "owned",
    title: "我创建的训练",
    emptyText: "暂无你创建的训练",
  },
  {
    key: "joined",
    title: "我加入的训练",
    emptyText: "暂无你加入的训练",
  },
  {
    key: "invited",
    title: "邀请我的训练",
    emptyText: "暂无邀请记录",
  },
]

const INITIAL_DATA: Record<TrainingMethod, TrainingUserEdge[]> = {
  owned: [],
  joined: [],
  invited: [],
  pin: [],
}

const INITIAL_LOADING: Record<TrainingMethod, boolean> = {
  owned: false,
  joined: false,
  invited: false,
  pin: false,
}

const INITIAL_ERROR: Record<TrainingMethod, string | null> = {
  owned: null,
  joined: null,
  invited: null,
  pin: null,
}

const STATUS_LABELS: Record<TrainingStatus, string> = {
  Owned: "拥有",
  Joined: "已加入",
  Invited: "已邀请",
  Completed: "已完成",
  Pin: "置顶",
  Unknown: "未知",
}

const toStringValue = (value: unknown) => {
  if (typeof value === "string") return value
  if (typeof value === "number") return String(value)
  if (typeof value === "bigint") return value.toString()
  return ""
}

const toNumberValue = (value: unknown) => {
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "bigint") return Number(value)
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

const resolveTrainingNodeId = (edge: TrainingUserEdge) => {
  const anyEdge = edge as unknown as Record<string, unknown>
  const primary = toNumberValue(anyEdge["v"] ?? anyEdge["training_node_id"])
  const fallback = toNumberValue(anyEdge["u"])
  return primary ?? fallback
}

const resolveStatusLabel = (edge: TrainingUserEdge) => {
  const anyEdge = edge as unknown as Record<string, unknown>
  const status = anyEdge["status"] as TrainingStatus | undefined
  return status ? STATUS_LABELS[status] ?? String(status) : ""
}

export default function TrainingListPage() {
  const [keyword, setKeyword] = useState("")
  const [trainings, setTrainings] = useState<Record<TrainingMethod, TrainingUserEdge[]>>(INITIAL_DATA)
  const [trainingDetails, setTrainingDetails] = useState<Record<string, Training | null>>({})
  const [currentUserIden, setCurrentUserIden] = useState("")
  const [loading, setLoading] = useState<Record<TrainingMethod, boolean>>({
    ...INITIAL_LOADING,
    owned: true,
    joined: true,
    invited: true,
  })
  const [error, setError] = useState<Record<TrainingMethod, string | null>>(INITIAL_ERROR)

  useEffect(() => {
    let active = true
    const fetchUser = async () => {
      try {
        const userResp = await getUserInfo()
        if (!active) return
        setCurrentUserIden(userResp.user?.iden || "")
      } catch (err) {
        if (active) {
          setCurrentUserIden("")
        }
      }
    }
    fetchUser()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const fetchData = async () => {
      setLoading({
        ...INITIAL_LOADING,
        owned: true,
        joined: true,
        invited: true,
      })
      setError(INITIAL_ERROR)
      try {
        const results = await Promise.allSettled(
          METHOD_CONFIG.map((config) => getNormal({ method: config.key }))
        )
        if (!active) return

        const nextData = { ...INITIAL_DATA }
        const nextError = { ...INITIAL_ERROR }

        results.forEach((result, index) => {
          const methodKey = METHOD_CONFIG[index].key
          if (result.status === "fulfilled") {
            nextData[methodKey] = result.value.data
          } else {
            nextError[methodKey] =
              result.reason instanceof Error
                ? result.reason.message
                : "获取训练列表失败"
          }
        })

        setTrainings(nextData)
        setError(nextError)
      } finally {
        if (active) {
          setLoading({ ...INITIAL_LOADING })
        }
      }
    }

    fetchData()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    let active = true
    const fetchDetails = async () => {
      const nodeIdSet = new Set<number>()
      const nodeIdList: number[] = []

      METHOD_CONFIG.forEach((config) => {
        trainings[config.key].forEach((edge) => {
          const nodeId = resolveTrainingNodeId(edge)
          if (nodeId === null) return
          const key = String(nodeId)
          if (trainingDetails[key] !== undefined || nodeIdSet.has(nodeId)) return
          nodeIdSet.add(nodeId)
          nodeIdList.push(nodeId)
        })
      })

      if (nodeIdList.length === 0) return

      const results = await Promise.allSettled(
        nodeIdList.map((nodeId) => getViewDirect({ t_node_id: nodeId }))
      )

      if (!active) return

      setTrainingDetails((prev) => {
        const next = { ...prev }
        results.forEach((result, index) => {
          const nodeId = nodeIdList[index]
          if (result.status === "fulfilled") {
            next[String(nodeId)] = result.value.data
          } else {
            next[String(nodeId)] = null
          }
        })
        return next
      })
    }

    fetchDetails()
    return () => {
      active = false
    }
  }, [trainings, trainingDetails])

  const filterTrainings = (list: TrainingUserEdge[]) => {
    const trimmed = keyword.trim().toLowerCase()
    if (!trimmed) return list
    return list.filter((edge) => {
      const trainingNodeId = resolveTrainingNodeId(edge)
      const trainingDetail = trainingNodeId ? trainingDetails[String(trainingNodeId)] : null
      const trainingPublic = trainingDetail?.training_node.public
      const name = trainingPublic?.name || ""
      const iden = trainingPublic?.iden || ""
      return name.toLowerCase().includes(trimmed) || iden.toLowerCase().includes(trimmed)
    })
  }

  const filteredCounts = METHOD_CONFIG.reduce(
    (acc, config) => {
      acc[config.key] = filterTrainings(trainings[config.key]).length
      return acc
    },
    { owned: 0, joined: 0, invited: 0 } as Record<TrainingMethod, number>
  )

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0">
      <div className="flex-1 w-full py-6 px-4 md:px-6 lg:overflow-y-auto">
        <TitleCard title="训练" description="Training" />

        <div className="space-y-6">
          {METHOD_CONFIG.map((config) => {
            const list = filterTrainings(trainings[config.key])
            return (
              <StandardCard key={config.key} title={config.title}>
                <div className="">
                  {loading[config.key] ? (
                    <div className="flex items-center justify-center py-12 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin mr-2" />
                      加载中...
                    </div>
                  ) : error[config.key] ? (
                    <div className="text-center text-red-600 py-10">
                      {error[config.key]}
                    </div>
                  ) : list.length === 0 ? (
                    <div className="text-center text-muted-foreground py-10">
                      {config.emptyText}
                    </div>
                  ) : (
                    <div className="">
                      {list.map((edge, index) => {
                        const trainingNodeId = resolveTrainingNodeId(edge)
                        const trainingDetail = trainingNodeId ? trainingDetails[String(trainingNodeId)] : null
                        const trainingPublic = trainingDetail?.training_node.public || null
                        const trainingIden = trainingPublic?.iden || ""
                        const statusLabel = resolveStatusLabel(edge)
                        const href = currentUserIden && trainingIden
                          ? `/training/${currentUserIden}/${trainingIden}`
                          : ""
                        const detailLoading = trainingNodeId !== null && trainingDetails[String(trainingNodeId)] === undefined

                        return (
                          <div key={`${trainingIden || trainingNodeId || index}-${index}`} className="space-y-2 mb-4">
                            {detailLoading ? (
                              <div className="rounded-lg border p-4 text-muted-foreground">
                                正在加载训练详情...
                              </div>
                            ) : href && trainingPublic ? (
                              <Link href={href} className="block">
                                <TrainingCard training={trainingPublic} />
                              </Link>
                            ) : trainingPublic ? (
                              <TrainingCard training={trainingPublic} />
                            ) : (
                              <div className="rounded-lg border p-4">无法解析训练信息</div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>
              </StandardCard>
            )
          })}
        </div>
      </div>

      <RightSidebar defaultWidth={320} minWidth={240} maxWidth={480}>
        <SidebarGroup>
          <SidebarGroupLabel>快捷操作</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-auto py-2">
                  <Link href="/training/create">
                    <PlusCircle className="size-4" />
                    <span>创建训练</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>筛选</SidebarGroupLabel>
          <SidebarGroupContent className="px-3 space-y-3">
            <div className="space-y-2">
              <div className="text-xs text-muted-foreground flex items-center gap-2">
                <Filter className="size-3.5" />
                <span>搜索训练</span>
              </div>
              <Input
                placeholder="名称或 ID"
                value={keyword}
                onChange={(event) => setKeyword(event.target.value)}
              />
            </div>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>统计</SidebarGroupLabel>
          <SidebarGroupContent className="px-3 space-y-3">
            <div className="grid grid-cols-1 gap-2">
              <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <ListTree className="size-3.5 text-blue-600" />
                  <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">我创建的训练</span>
                </div>
                <div className="text-xl font-bold text-blue-700 dark:text-blue-400">{filteredCounts.owned}</div>
              </div>
              <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Users className="size-3.5 text-green-600" />
                  <span className="text-[10px] font-medium text-green-700 dark:text-green-400">我加入的训练</span>
                </div>
                <div className="text-xl font-bold text-green-700 dark:text-green-400">{filteredCounts.joined}</div>
              </div>
              <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <Mail className="size-3.5 text-amber-600" />
                  <span className="text-[10px] font-medium text-amber-700 dark:text-amber-400">邀请我的训练</span>
                </div>
                <div className="text-xl font-bold text-amber-700 dark:text-amber-400">{filteredCounts.invited}</div>
              </div>
            </div>
          </SidebarGroupContent>
        </SidebarGroup>
      </RightSidebar>
    </div>
  )
}
