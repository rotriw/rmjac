"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import {
  UserPlus,
  User,
  CheckCircle2,
  XCircle,
  LayoutDashboard,
  History,
  PlusCircle,
  Clock,
  Workflow,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getMyAccounts } from "@/api/server/api_vjudge_my_accounts"
import { getTaskList } from "@/api/server/api_vjudge_tasks"
import { getWorkflowServices, type WorkflowServiceInfo } from "@/api/server/api_vjudge_workflow"
import { VjudgeNode, VjudgeTaskWithAccount } from "@rmjac/api-declare"
import { Button } from "@/components/ui/button"
import { RightSidebar } from "@/components/layout/right-sidebar"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/components/vjudge/workflow-timeline"

export function VJudgeRightSidebar() {
  const [accounts, setAccounts] = useState<VjudgeNode[]>([])
  const [recentTickets, setRecentTickets] = useState<VjudgeTaskWithAccount[]>([])
  const [loading, setLoading] = useState(true)
  const [workflowServices, setWorkflowServices] = useState<WorkflowServiceInfo[]>([])
  const pathname = usePathname()

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const [accountsResp, ticketsResp, servicesResp] = await Promise.all([
        getMyAccounts().catch(() => ({ data: [] })),
        getTaskList({ page: 1, limit: 3 }).catch(() => ({ data: { data: [], total: BigInt(0) } })),
        getWorkflowServices().catch(() => ({ data: [] })),
      ])
      setAccounts(accountsResp.data || [])
      setRecentTickets(ticketsResp.data?.data || [])
      setWorkflowServices((servicesResp as any).data || [])
    } catch (err) {
      console.error("Sidebar data fetch error:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  return (
    <RightSidebar defaultWidth={300} minWidth={250} maxWidth={500}>
      <SidebarGroup>
        <SidebarGroupLabel>快捷操作</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton asChild isActive={pathname === "/vjudge/account"}>
                <Link href="/vjudge/account">
                  <LayoutDashboard className="size-4" />
                  <span>账号概览</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/vjudge/add"}
                className="text-primary hover:text-primary"
              >
                <Link href="/vjudge/add">
                  <UserPlus className="size-4" />
                  <span className="font-semibold">添加新账号</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
            <SidebarMenuItem>
              <SidebarMenuButton
                asChild
                isActive={pathname === "/vjudge/task"}
                className="text-primary hover:text-primary"
              >
                <Link href="/vjudge/task?new=1">
                  <PlusCircle className="size-4" />
                  <span className="font-semibold">创建工单</span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel>已绑定账号</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {loading && accounts.length === 0 ? (
              <div className="px-4 py-2 text-xs text-muted-foreground">加载中...</div>
            ) : accounts.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                暂无绑定账号
              </div>
            ) : (
              accounts.map((account) => {
                const handle = account.public.iden
                const isActive = pathname === `/vjudge/manage/${account.node_id}`

                return (
                  <SidebarMenuItem key={account.node_id}>
                    <SidebarMenuButton
                      asChild
                      isActive={isActive}
                      className="h-auto py-2"
                    >
                      <Link
                        href={`/vjudge/manage/${account.node_id}`}
                        className="flex flex-col items-start gap-1"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <User className="size-3 text-muted-foreground" />
                            <span className="font-medium text-sm truncate max-w-[120px]">
                              {handle}
                            </span>
                          </div>
                          {account.public.verified ? (
                            <CheckCircle2 className="size-3 text-green-500" />
                          ) : (
                            <XCircle className="size-3 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <Badge
                            variant="outline"
                            className="text-[10px] px-1 py-0 h-4"
                          >
                            {account.public.platform}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {account.public.remote_mode}
                          </span>
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* 最近工单预览 */}
      <SidebarGroup>
        <div className="flex items-center justify-between px-2 mb-2">
          <SidebarGroupLabel className="p-0">最近工单</SidebarGroupLabel>
          <Button asChild variant="ghost" size="icon" className="size-6 text-primary">
            <Link href="/vjudge/task">
              <History className="size-3" />
            </Link>
          </Button>
        </div>
        <SidebarGroupContent>
          <SidebarMenu>
            {loading && recentTickets.length === 0 ? (
              <div className="px-4 py-2 text-xs text-muted-foreground">
                加载中...
              </div>
            ) : recentTickets.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                暂无工单
              </div>
            ) : (
              recentTickets.map((ticket) => (
                <SidebarMenuItem key={ticket.task.node_id}>
                  <SidebarMenuButton asChild className="h-auto py-2">
                    <Link
                      href={`/vjudge/task/${ticket.task.node_id}`}
                      className="flex flex-col items-start gap-1"
                    >
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <History className="size-3 text-muted-foreground" />
                          <span className="font-medium text-xs">
                            #{ticket.task.node_id.toString()}
                          </span>
                        </div>
                        <Badge
                          variant={
                            ticket.task.public.status === "completed"
                              ? "default"
                              : ticket.task.public.status === "failed"
                                ? "destructive"
                                : "secondary"
                          }
                          className="text-[8px] px-1 py-0 h-3"
                        >
                          {ticket.task.public.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between w-full text-[10px] text-muted-foreground">
                        <span>@{ticket.handle}</span>
                        <div className="flex items-center gap-1">
                          <Clock className="size-2" />
                          <span>{formatRelativeTime(ticket.task.public.created_at)}</span>
                        </div>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
            <SidebarMenuItem>
              <SidebarMenuButton asChild className="justify-center text-[10px] text-muted-foreground">
                <Link href="/vjudge/task">查看全部工单</Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      {/* 工作流服务状态 */}
      {workflowServices.length > 0 && (
        <>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>
              <div className="flex items-center gap-1.5">
                <Workflow className="size-3" />
                边缘服务
              </div>
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 space-y-1.5">
                {workflowServices.map((svc) => {
                  const isOnline = svc.available_sockets > 0
                  return (
                    <div
                      key={svc.name}
                      className={cn(
                        "flex items-center justify-between px-2 py-1.5 rounded-md text-[10px] border",
                        isOnline
                          ? "bg-green-500/5 border-green-500/20"
                          : "bg-muted/30 border-transparent"
                      )}
                    >
                      <div className="flex items-center gap-1.5">
                        <div
                          className={cn(
                            "size-1.5 rounded-full",
                            isOnline ? "bg-green-500" : "bg-gray-400"
                          )}
                        />
                        <span className="font-mono truncate max-w-[140px]">
                          {svc.platform}:{svc.operation}
                          {svc.method ? `:${svc.method}` : ""}
                        </span>
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          "text-[8px] px-1 py-0 h-3",
                          isOnline ? "text-green-600" : "text-gray-400"
                        )}
                      >
                        <Zap className="size-2 mr-0.5" />
                        {svc.available_sockets}
                      </Badge>
                    </div>
                  )
                })}
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      )}
    </RightSidebar>
  )
}
