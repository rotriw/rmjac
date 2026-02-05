"use client"

import * as React from "react"
import Link from "next/link"
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
import { Settings, CheckCircle2, ListTree, ArrowLeft, Code2, FileCode, Pin, PinOff, Loader2 } from "lucide-react"
import { TrainingProblem } from "@rmjac/api-declare"
import { ScrollArea } from "@/components/ui/scroll-area"
import { RightSidebar } from "@/components/layout/right-sidebar"
import { toast } from "sonner"
import { postSetPin } from "@/api/client/api_training_view"

interface ProblemSubmission {
  problemId: string
  problemName: string
  edgeId: number
  problemNodeId: number
  status?: string
}

interface TrainingRightSidebarProps {
  userIden: string
  trainingIden: string
  trainingNodeId: number
  initialPinned?: boolean
  hasEditPermission: boolean
  completedCount: number
  totalCount: number
  viewMode?: "problems" | "submissions"
  onViewModeChange?: (mode: "problems" | "submissions") => void
  problems?: TrainingProblem[]
  statusMap?: Map<number, string>
  selectedProblemId?: string
  onProblemSelect?: (problemId: string) => void
}

export function TrainingRightSidebar({
  userIden,
  trainingIden,
  trainingNodeId,
  initialPinned = false,
  hasEditPermission,
  completedCount,
  totalCount,
  viewMode = "problems",
  onViewModeChange,
  problems = [],
  statusMap = new Map(),
  selectedProblemId,
  onProblemSelect,
}: TrainingRightSidebarProps) {
  const [problemList, setProblemList] = React.useState<ProblemSubmission[]>([])
  const [isPinned, setIsPinned] = React.useState<boolean>(initialPinned)
  const [pinLoading, setPinLoading] = React.useState(false)

  // 递归提取所有题目
  const extractProblems = React.useCallback((
    problemList: TrainingProblem[],
    result: ProblemSubmission[] = []
  ): ProblemSubmission[] => {
    for (const problem of problemList) {
      if ("ProblemIden" in problem) {
        const [edgeId, problemIden, problemNodeId] = problem.ProblemIden
        const edgeIdNum = typeof edgeId === "bigint" ? Number(edgeId) : edgeId
        const problemNodeIdNum = typeof problemNodeId === "bigint" ? Number(problemNodeId) : problemNodeId
        const status = statusMap.get(problemNodeIdNum)
        
        result.push({
          problemId: String(problemIden),
          problemName: String(problemIden),
          edgeId: edgeIdNum,
          problemNodeId: problemNodeIdNum,
          status
        })
      } else if ("ProblemTraining" in problem) {
        extractProblems(problem.ProblemTraining.own_problem, result)
      }
    }
    return result
  }, [statusMap])

  React.useEffect(() => {
    if (problems.length > 0) {
      const extracted = extractProblems(problems)
      setProblemList(extracted)
      // 如果没有选中题目且有题目列表，自动选中第一题
      if (!selectedProblemId && extracted.length > 0 && onProblemSelect) {
        onProblemSelect(extracted[0].problemId)
      }
    }
  }, [problems, extractProblems, selectedProblemId, onProblemSelect])

  const handleTogglePin = async () => {
    if (!trainingNodeId) {
      toast.error("无法获取训练 ID")
      return
    }

    try {
      setPinLoading(true)
      const nextPin = !isPinned
      await postSetPin({ t_node_id: trainingNodeId, pin: nextPin })
      setIsPinned(nextPin)
      toast.success(nextPin ? "已置顶训练" : "已取消置顶")
    } catch (error) {
      const msg = error instanceof Error ? error.message : "操作失败"
      toast.error(msg)
    } finally {
      setPinLoading(false)
    }
  }

  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  return (
    <RightSidebar defaultWidth={320} minWidth={200} maxWidth={600}>
      {/* 切换视图 */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onViewModeChange?.(viewMode === "problems" ? "submissions" : "problems")}
                className={`h-auto py-3 flex-col items-start gap-1 transition-all rounded-lg mx-1 border backdrop-blur-md ${
                  viewMode === "submissions"
                    ? "bg-primary text-primary-foreground border-primary shadow-md hover:bg-primary/90 hover:text-white"
                    : "bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 !text-sidebar-foreground"
                }`}
              >
                <div className="flex items-center justify-between w-full px-1">
                  <div className="flex items-center gap-2">
                    <Code2 className={`size-4 ${viewMode === "submissions" ? "text-primary-foreground" : "text-primary/80"}`} />
                    <span className="font-semibold text-xs">{viewMode === "submissions" ? "返回题目列表" : "查看提交代码"}</span>
                  </div>
                </div>
                <div className={`text-[10px] pl-7 font-medium ${viewMode === "submissions" ? "text-primary-foreground/80" : "text-muted-foreground/80"}`}>
                  {viewMode === "submissions" ? "点击返回" : "点击查看"}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />
      {viewMode === "submissions" && problemList.length > 0 && (
        <>
          <SidebarGroup>
            <SidebarGroupLabel>选择题目</SidebarGroupLabel>
            <SidebarGroupContent>
              <ScrollArea>
                <SidebarMenu>
                  {problemList.map((problem) => (
                    <SidebarMenuItem key={problem.edgeId}>
                      <SidebarMenuButton
                        onClick={() => onProblemSelect?.(problem.problemId)}
                        className={`h-auto py-2.5 flex-col items-start gap-1 transition-all rounded-lg border ${
                          selectedProblemId === problem.problemId
                            ? "bg-primary/10 border-primary text-primary"
                            : "border-transparent hover:bg-white/5 dark:hover:bg-white/5"
                        }`}
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center gap-2">
                            <FileCode className="size-3.5" />
                            <span className="font-medium text-xs">{problem.problemName}</span>
                          </div>
                          {problem.status === "Accepted" && (
                            <Badge className="bg-green-600 text-white text-[10px] px-1.5 py-0">✓</Badge>
                          )}
                        </div>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </ScrollArea>
            </SidebarGroupContent>
          </SidebarGroup>
          <SidebarSeparator />
        </>
      )}
      {/* 导航区域 */}
      <SidebarGroup>
        <SidebarGroupLabel>导航</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/training">
                <SidebarMenuButton className="h-auto py-3 flex-col items-start gap-1 bg-white/5 dark:bg-white/5 backdrop-blur-md border border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 !text-sidebar-foreground hover:!text-sidebar-foreground transition-all rounded-lg">
                  <div className="flex items-center gap-2 px-1">
                    <ArrowLeft className="size-4 text-primary/80" />
                    <span className="font-semibold text-xs">返回训练列表</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      <SidebarGroup>
        <SidebarGroupLabel>操作</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={handleTogglePin}
                disabled={pinLoading}
                className="h-auto py-3 flex-col items-start gap-1 transition-all rounded-lg mx-1 border backdrop-blur-md bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 !text-sidebar-foreground"
              >
                <div className="flex items-center gap-2 px-1">
                  {pinLoading ? (
                    <Loader2 className="size-4 animate-spin text-primary/80" />
                  ) : isPinned ? (
                    <PinOff className="size-4 text-primary/80" />
                  ) : (
                    <Pin className="size-4 text-primary/80" />
                  )}
                  <span className="font-semibold text-xs">{isPinned ? "取消置顶" : "置顶训练"}</span>
                </div>
                <div className="text-[10px] pl-7 font-medium text-muted-foreground/80">
                  {isPinned ? "从训练列表取消置顶" : "在训练列表顶部展示"}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* 进度统计 */}
      <SidebarGroup>
        <SidebarGroupLabel>训练进度</SidebarGroupLabel>
        <SidebarGroupContent className="px-3 space-y-3">
          {/* 进度条 */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">完成进度</span>
              <span className="font-semibold text-primary">{progressPercentage}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div 
                className="h-full bg-green-500 transition-all duration-300"
                style={{ width: `${progressPercentage}%` }}
              />
            </div>
          </div>

          {/* 统计卡片 */}
          <div className="grid grid-cols-2 gap-2">
            <div className="bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <CheckCircle2 className="size-3.5 text-green-600" />
                <span className="text-[10px] font-medium text-green-700 dark:text-green-400">已完成</span>
              </div>
              <div className="text-xl font-bold text-green-700 dark:text-green-400">{completedCount}</div>
            </div>

            <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <div className="flex items-center gap-1.5 mb-1">
                <ListTree className="size-3.5 text-blue-600" />
                <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">总题数</span>
              </div>
              <div className="text-xl font-bold text-blue-700 dark:text-blue-400">{totalCount}</div>
            </div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* 题目选择 - 仅在提交记录模式显示 */}
      

      {/* 管理操作 - 仅有权限时显示 */}
      {hasEditPermission && (
        <>
          <SidebarSeparator />
          <SidebarGroup>
            <SidebarGroupLabel>管理</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <Link href={`/training/manage/${userIden}/${trainingIden}`}>
                    <SidebarMenuButton className="h-auto py-3 flex-col items-start gap-1 transition-all rounded-lg border backdrop-blur-md bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 !text-sidebar-foreground">
                      <div className="flex items-center gap-2 px-1">
                        <Settings className="size-4 text-primary/80" />
                        <span className="font-semibold text-xs">管理训练</span>
                      </div>
                      <div className="text-[10px] pl-7 font-medium text-muted-foreground/80">
                        编辑题目和设置
                      </div>
                    </SidebarMenuButton>
                  </Link>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </>
      )}
    </RightSidebar>
  )
}
