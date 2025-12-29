"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
  useSidebar,
} from "@/components/ui/sidebar"
import { Edit, Timer, HardDrive, Tag, History, SendIcon, ChevronRight, LibraryIcon } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

import { Record } from "./page"

interface ProblemRightSidebarProps extends React.ComponentProps<typeof Sidebar> {
  problemId: string
  mainLimit?: {
    public: {
      time_limit: number
      memory_limit: number
    }
  }
  tags?: Array<{
    node_id: number
    public: {
      tag_name: string
    }
  }>
  userRecords?: Record[]
  statements?: Array<{
    node_id: number
    public: {
      source: string
      creation_time: string
    }
  }>
  currentStatementId?: number
  viewMode?: "statement" | "submit"
  onViewModeChange?: (mode: "statement" | "submit") => void
}

export function ProblemRightSidebar({
  problemId,
  mainLimit,
  tags,
  userRecords = [],
  viewMode = "statement",
  onViewModeChange,
  ...props
}: ProblemRightSidebarProps) {
  const [width, setWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const { isMobile } = useSidebar()

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX
        if (newWidth > 200 && newWidth < 600) {
          setWidth(newWidth)
        }
      }
    },
    [isResizing]
  )

  useEffect(() => {
    window.addEventListener("mousemove", resize)
    window.addEventListener("mouseup", stopResizing)
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [resize, stopResizing])

  const getStatusText = (status: number) => {
    const statusMap: { [key: number]: string } = {
      0: "Pending",
      1: "Running",
      2: "Accepted",
      3: "Wrong Answer",
      4: "Time Limit Exceeded",
      5: "Memory Limit Exceeded",
      6: "Runtime Error",
      7: "Compile Error",
    }
    return statusMap[status] || "Unknown"
  }

  return (
    <Sidebar
      side="right"
      variant="sidebar"
      collapsible="none"
      className="border-l bg-sidebar lg:h-screen lg:sticky lg:top-0 transition-none w-full lg:w-auto"
      style={{ width: !isMobile ? `${width}px` : undefined }}
      {...props}
    >
      {!isMobile && (
        <div
          className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-50"
          onMouseDown={startResizing}
        />
      )}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => onViewModeChange?.(viewMode === "statement" ? "submit" : "statement")}
                  className={`h-auto py-3 flex-col items-start gap-1 transition-all rounded-lg mx-1 border backdrop-blur-md ${
                    viewMode === "submit"
                      ? "bg-primary text-primary-foreground border-primary shadow-md hover:bg-primary/90 hover:text-white"
                      : "bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 !text-sidebar-foreground"
                  }`}
                >
                  <div className="flex items-center justify-between w-full px-1">
                    <div className="flex items-center gap-2">
                      <SendIcon className={`size-4 ${viewMode === "submit" ? "text-primary-foreground" : "text-primary/80"}`} />
                      <span className="font-semibold text-xs">{viewMode === "submit" ? "返回题面" : "提交题目"}</span>
                    </div>
                  </div>
                  <div className={`text-[10px] pl-7 font-medium ${viewMode === "submit" ? "text-primary-foreground/80" : "text-muted-foreground/80"}`}>
                    {viewMode === "submit" ? "点击返回" : "点击提交"}
                  </div>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarSeparator />

        {mainLimit && (
          <SidebarGroup>
            <SidebarGroupLabel>题目限制</SidebarGroupLabel>
            <SidebarGroupContent>
              <Sheet>
                <Badge className="bg-sidebar-accent text-neutral-800 font-medium rounded-sm mr-1" >{mainLimit.public.time_limit}ms</Badge>
                <Badge className="bg-sidebar-accent text-neutral-800 font-medium" >{mainLimit.public.memory_limit}MB</Badge>
              </Sheet>
            </SidebarGroupContent>
          </SidebarGroup>
        )}


        <SidebarSeparator />
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <Sheet>
                  <SheetTrigger asChild>
                    <SidebarMenuButton className="h-auto py-3 flex-col items-start gap-1 bg-white/5 dark:bg-white/5 backdrop-blur-md border border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 !text-sidebar-foreground hover:!text-sidebar-foreground transition-all active:scale-[0.98] rounded-lg mx-1">
                      <div className="flex items-center justify-between w-full px-1">
                        <div className="flex items-center gap-2">
                          <LibraryIcon className="size-4 text-primary/80" />
                          <span className="font-semibold text-xs text-sidebar-foreground">
                            {props.statements?.find(s => s.node_id === props.currentStatementId)?.public.source || "默认题面"}
                          </span>
                        </div>
                        <ChevronRight className="size-3 text-muted-foreground/60" />
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 pl-7 font-medium">
                        点击切换题面
                      </div>
                    </SidebarMenuButton>
                  </SheetTrigger>
                  <SheetContent side="right" className="w-[400px] sm:w-[540px]">
                    <SheetHeader>
                      <SheetTitle>其他题面</SheetTitle>
                    </SheetHeader>
                    <div className="p-2 space-y-1">
                      {props.statements?.map((stmt) => (
                        <div
                          key={stmt.node_id}
                          className={`p-4 border rounded-lg cursor-pointer transition-colors hover:bg-accent ${stmt.node_id === props.currentStatementId ? 'border-primary bg-primary/5' : ''}`}
                          onClick={() => {
                            // 这里通常需要调用一个切换题面的函数，目前先保持 UI 逻辑
                            window.location.search = `?statement=${stmt.node_id}`
                          }}
                        >
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-semibold text-sm">{stmt.public.source || "未命名题面"}</span>
                            {stmt.node_id === props.currentStatementId && (
                              <Badge variant="default" className="text-[10px] h-4 px-1">当前</Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            ID: {stmt.node_id} • {new Date(stmt.public.creation_time).toLocaleDateString()}
                          </div>
                        </div>
                      ))}
                    </div>
                  </SheetContent>
                </Sheet>
              </SidebarMenuItem>
            </SidebarMenu>
          </SidebarGroupContent>
          </SidebarGroup>


        <SidebarSeparator />

        {tags && tags.length ? (
          <SidebarGroup>
            <SidebarGroupLabel>标签</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {tags.map((tag) => (
                  <SidebarMenuItem key={tag.node_id}>
                    <SidebarMenuButton>
                      <Tag className="size-4" />
                      <span>{tag.public.tag_name}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ) : (<>
        <SidebarGroup>
            <SidebarGroupLabel>标签</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="px-2 py-4 text-center text-muted-foreground text-xs">
                无标签
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        </>)}

        <SidebarSeparator />

        <SidebarGroup>
          <SidebarGroupLabel>最近提交</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {userRecords && userRecords.length > 0 ? (
                <>
                  {userRecords.slice(0, 5).map((record) => (
                    <SidebarMenuItem key={record.node_id}>
                      <SidebarMenuButton className="h-auto py-2 flex-col items-start gap-1 bg-white/5 dark:bg-white/5 backdrop-blur-md border border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 !text-sidebar-foreground hover:!text-sidebar-foreground transition-all rounded-lg mx-1 shadow-sm mb-1">
                        <div className="flex items-center justify-between w-full px-1">
                          <Badge
                            variant={record.public.record_status === 2 ? "default" : "destructive"}
                            className="text-[10px] px-1 py-0 h-4"
                          >
                            {getStatusText(record.public.record_status)}
                          </Badge>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(record.public.creation_time).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="text-[10px] text-muted-foreground flex justify-between w-full">
                          <span>{record.public.language}</span>
                          <span>{record.public.time_elapsed}ms / {record.public.memory_used}KB</span>
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                  <SidebarMenuItem>
                    <SidebarMenuButton className="justify-center text-xs text-muted-foreground">
                      <History className="size-3" />
                      <span>查看全部记录</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </>
              ) : (
                <SidebarMenuItem>
                  <div className="px-2 py-4 text-center text-muted-foreground text-xs">
                    暂无提交记录
                  </div>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}