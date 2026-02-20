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
  Filter
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { getMyAccounts } from "@/api/server/api_vjudge_my_accounts"
import { getTasks } from "@/api/server/api_vjudge_tasks"
import { VjudgeNode, VjudgeTaskNode } from "@rmjac/api-declare"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Button } from "@/components/ui/button"
import { RightSidebar } from "@/components/layout/right-sidebar"

export function VJudgeRightSidebar() {
  const [accounts, setAccounts] = useState<VjudgeNode[]>([])
  const [tasks, setTasks] = useState<VjudgeTaskNode[]>([])
  const [loading, setLoading] = useState(true)
  const pathname = usePathname()

  const fetchAccounts = useCallback(async () => {
    try {
      const response = await getMyAccounts()
      setAccounts(response.data)
    } catch (error) {
      console.error("Failed to fetch accounts:", error)
    }
  }, [])

  const fetchTasks = useCallback(async () => {
    console.log(accounts);
    if (accounts.length > 0) {
      try {
        const allTasks: VjudgeTaskNode[] = []
        for (const acc of accounts) {
          const accTasksResponse = await getTasks({ node_id: acc.node_id.toString() })
          allTasks.push(...accTasksResponse.data)
        }
        setTasks(allTasks.sort((a, b) => new Date(b.public.created_at).getTime() - new Date(a.public.created_at).getTime()))
      } catch (error) {
        console.error("Failed to fetch tasks:", error)
      }
    }
    setLoading(false)
  }, [accounts])

  useEffect(() => {
    fetchAccounts()
  }, [fetchAccounts])

  useEffect(() => {
    if (accounts.length > 0) {
      fetchTasks()
    } else if (!loading) {
      setLoading(false)
    }
  }, [accounts, fetchTasks])

  const getHandle = (account: VjudgeNode) => {
    return account.public.iden;
  }

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
                const handle = getHandle(account)
                const isActive = pathname === `/vjudge/manage/${account.node_id}`
                
                return (
                  <SidebarMenuItem key={account.node_id}>
                    <SidebarMenuButton 
                      asChild 
                      isActive={isActive}
                      className="h-auto py-2"
                    >
                      <Link href={`/vjudge/manage/${account.node_id}`} className="flex flex-col items-start gap-1">
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <User className="size-3 text-muted-foreground" />
                            <span className="font-medium text-sm truncate max-w-[120px]">{handle}</span>
                          </div>
                          {account.public.verified ? (
                            <CheckCircle2 className="size-3 text-green-500" />
                          ) : (
                            <XCircle className="size-3 text-red-500" />
                          )}
                        </div>
                        <div className="flex items-center justify-between w-full">
                          <Badge variant="outline" className="text-[10px] px-1 py-0 h-4">
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

      <SidebarGroup>
        <div className="flex items-center justify-between px-2 mb-2">
          <SidebarGroupLabel className="p-0">同步任务</SidebarGroupLabel>
          <div className="flex items-center gap-1">
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="ghost" size="icon" className="size-6">
                  <Filter className="size-3 text-muted-foreground" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-60 p-3" align="end">
                <div className="space-y-3">
                  <h4 className="font-medium text-xs">筛选任务</h4>
                  <div className="space-y-2">
                    <Label className="text-[10px]">提交类型</Label>
                    <Input placeholder="例如: recent, all" className="h-7 text-xs" />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-[10px]">时间范围</Label>
                    <Input type="date" className="h-7 text-xs" />
                  </div>
                  <Button size="sm" className="w-full h-7 text-xs">应用筛选</Button>
                </div>
              </PopoverContent>
            </Popover>
            <Button asChild variant="ghost" size="icon" className="size-6 text-primary">
              <Link href="/vjudge/task">
                <PlusCircle className="size-3" />
              </Link>
            </Button>
          </div>
        </div>
        <SidebarGroupContent>
          <SidebarMenu>
            {loading && tasks.length === 0 ? (
              <div className="px-4 py-2 text-xs text-muted-foreground">加载中...</div>
            ) : tasks.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">
                暂无同步任务
              </div>
            ) : (
              tasks.slice(0, 10).map((task) => (
                <SidebarMenuItem key={task.node_id}>
                  <SidebarMenuButton 
                    asChild 
                    className="h-auto py-2"
                  >
                    <Link href={`/vjudge/task?id=${task.node_id}`} className="flex flex-col items-start gap-1">
                      <div className="flex items-center justify-between w-full">
                        <div className="flex items-center gap-2">
                          <History className="size-3 text-muted-foreground" />
                          <span className="font-medium text-xs">任务 #{task.node_id}</span>
                        </div>
                        <Badge 
                          variant={task.public.status === "success" ? "default" : task.public.status === "running" ? "secondary" : "destructive"}
                          className="text-[8px] px-1 py-0 h-3"
                        >
                          {task.public.status}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between w-full text-[10px] text-muted-foreground">
                        <div className="flex items-center gap-1">
                          <Clock className="size-2" />
                          <span>{new Date(task.public.created_at).toLocaleDateString()}</span>
                        </div>
                        <span className="truncate max-w-[80px]">{task.public.log?.split('\n')[0] || "无日志"}</span>
                      </div>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))
            )}
            {tasks.length > 10 && (
              <SidebarMenuItem>
                <SidebarMenuButton className="justify-center text-[10px] text-muted-foreground">
                  查看更多任务
                </SidebarMenuButton>
              </SidebarMenuItem>
            )}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </RightSidebar>
  )
}
