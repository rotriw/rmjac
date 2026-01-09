"use client"

import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { deleteVJudgeAccount, assignVJudgeTask } from "@/api/server/vjudge"
import { useRouter } from "next/navigation"
import { useCallback, useEffect, useState } from "react"
import { Badge, ChevronRight, LibraryIcon, Loader2, RefreshCwIcon, SendIcon, Sheet, Tag } from "lucide-react"
import { Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarSeparator, useSidebar } from "../ui/sidebar"
import { SheetTrigger, SheetContent, SheetHeader, SheetTitle } from "../ui/sheet"
import { socket } from "@/lib/socket"

interface ManageActionsProps {
    nodeId: number
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
      </SidebarContent>
    </Sidebar>
  )
}

export function ManageActions({ nodeId }: ManageActionsProps) {
    const router = useRouter()
    const [deleting, setDeleting] = useState(false)
    const [syncing, setSyncing] = useState(false)
    const [verifying, setVerifying] = useState(false)

    const handleDelete = async () => {
        if (!confirm("确定要解除绑定该账号吗？")) return
        setDeleting(true)
        try {
            await deleteVJudgeAccount(nodeId)
            router.push("/vjudge/account")
            router.refresh()
        } catch (e) {
            console.error(e)
            toast.error("解除绑定失败")
        } finally {
            setDeleting(false)
        }
    }

    const handleSync = async () => {
        setSyncing(true)
        try {
            await assignVJudgeTask({
                vjudge_node_id: nodeId,
                range: "recent"
            })
            toast.success("同步任务已提交")
        } catch (e) {
            console.error(e)
            toast.error("提交同步任务失败")
        } finally {
            setSyncing(false)
        }
    }

    const handleVerify = async () => {
        
        setVerifying(true)
        try {
          socket.on('vjudge_account_verified', (data) => {
            setVerifying(false)
            if (data[0] === '1') {
              toast.success("已验证，请刷新。");
            }
          })
          socket.emit('refresh_vjudge_account', {
            node_id: nodeId,
          })
        } catch (e) {
            console.error(e)
            toast.error("更新验证状态失败")
        }
    }

    return (
        <div className="flex flex-wrap gap-4">
            <Button variant="outline" onClick={handleSync} disabled={syncing}>
                {syncing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                同步最近提交
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
                {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                解除绑定
            </Button>
            <Button variant="outline" onClick={handleVerify} disabled={verifying}>
              {verifying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              更新验证状态
            </Button>
        </div>
    )
}




