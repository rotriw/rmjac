"use client"

import * as React from "react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar"
import { Info, Edit, Shield } from "lucide-react"
import { RightSidebar } from "@/components/layout/right-sidebar"

export type ManageMode = "info" | "problems" | "permissions"

interface ManageRightSidebarProps {
  mode: ManageMode
  setMode: (mode: ManageMode) => void
}

export function ManageRightSidebar({
  mode,
  setMode,
}: ManageRightSidebarProps) {
  const menuItems = [
    { id: "info" as ManageMode, label: "信息管理", icon: Info },
    { id: "problems" as ManageMode, label: "题目编辑", icon: Edit },
    { id: "permissions" as ManageMode, label: "权限编辑", icon: Shield },
  ]

  return (
    <RightSidebar defaultWidth={320} resizable={false}>
      <SidebarGroup>
        <SidebarGroupLabel>管理模式</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            {menuItems.map((item) => (
              <SidebarMenuItem key={item.id}>
                <SidebarMenuButton
                  onClick={() => setMode(item.id)}
                  className={`h-auto py-3 flex-col items-start gap-1 transition-all rounded-lg mx-1 border backdrop-blur-md mb-1 ${
                    mode === item.id
                      ? "bg-primary text-primary-foreground border-primary shadow-md hover:bg-primary/90 hover:text-white"
                      : "bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 !text-sidebar-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full px-1">
                    <div className="flex items-center gap-2">
                      <item.icon className={`size-4 ${mode === item.id ? "text-primary-foreground" : "text-primary/80"}`} />
                      <span className="font-semibold text-xs">{item.label}</span>
                    </div>
                  </div>
                  <div className={`text-[10px] pl-7 font-medium ${mode === item.id ? "text-primary-foreground/80" : "text-muted-foreground/80"}`}>
                    点击切换到{item.label}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            ))}
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>
    </RightSidebar>
  )
}
