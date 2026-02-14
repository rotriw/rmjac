"use client"

import { usePathname } from "next/navigation"
import { RightSidebar } from "@/components/layout/right-sidebar"
import {
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"
import { BookOpen, ListChecks, PlusCircle, UserCircle2 } from "lucide-react"
import Link from "next/link"
import { cn } from "@/lib/utils"

const MENU_ITEMS = [
  { href: "/vjudge", label: "概览", icon: BookOpen },
  { href: "/vjudge/account", label: "账号管理", icon: UserCircle2 },
  { href: "/vjudge/task", label: "任务列表", icon: ListChecks },
  { href: "/vjudge/add", label: "新增账号", icon: PlusCircle },
] as const

export function VJudgeRightSidebar() {
  const pathname = usePathname()

  return (
    <RightSidebar defaultWidth={300} minWidth={220} maxWidth={420}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>VJudge 导航</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {MENU_ITEMS.map((item) => {
                const active = pathname === item.href
                const Icon = item.icon
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton
                      asChild
                      className={cn(
                        "h-auto py-2.5 items-start gap-1",
                        active && "bg-primary/10 text-primary"
                      )}
                    >
                      <Link href={item.href}>
                        <div className="flex w-full items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Icon className="size-4" />
                            <span className="text-xs font-medium">{item.label}</span>
                          </div>
                          {active && (
                            <Badge className="text-[10px] px-1.5 py-0" variant="secondary">
                              当前
                            </Badge>
                          )}
                        </div>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>快捷入口</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild className="h-auto py-2.5">
                  <Link href="/vjudge/task/new">
                    <div className="flex w-full items-center justify-between">
                      <div className="flex items-center gap-2">
                        <PlusCircle className="size-4" />
                        <span className="text-xs font-medium">创建同步任务</span>
                      </div>
                    </div>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </RightSidebar>
  )
}
