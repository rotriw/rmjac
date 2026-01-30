"use client"

import { useEffect, useState } from "react"
import { StandardCard } from "@/components/card/card"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { getMyAccounts } from "@/api/server/api_vjudge_my_accounts"
import { postAssign } from "@/api/server/api_vjudge_assign"
import { AssignTaskReq, VjudgeNode } from "@rmjac/api-declare"
import { socket } from "@/lib/socket"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface AddTaskCardProps {
  onSubmitSuccess?: (taskId: number, accountId: number) => void
}

const VJUDGE_CONFIG: Record<string, Record<string, string[]>> = {
  codeforces: {
    OnlySync: ["syncList"],
    "1": ["syncList"],
    SyncCode: ["submit", "syncOne"],
    "2": ["submit", "syncOne"],
  },
}

export function AddTaskCard({ onSubmitSuccess }: AddTaskCardProps) {
  const router = useRouter()
  const [accounts, setAccounts] = useState<VjudgeNode[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedAccount, setSelectedAccount] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<string | null>(null)
  const [selectedScope, setSelectedScope] = useState<string | null>(null)
  const [syncStart, setSyncStart] = useState<string>("1")
  const [syncCount, setSyncCount] = useState<string>("50")
  const [cfContestId, setCfContestId] = useState<string>("")
  const [cfProblemId, setCfProblemId] = useState<string>("")
  const [cfLink, setCfLink] = useState<string>("")
  const [customRangeOpen, setCustomRangeOpen] = useState(false)

  useEffect(() => {
    getMyAccounts()
      .then((resp) => {
        setAccounts(resp.data || [])
      })
      .catch((err: Error) => {
        console.error("Failed to load accounts", err)
      })
  }, [])

  useEffect(() => {
    if (selectedScope !== "custom") {
      setCustomRangeOpen(false)
    }
  }, [selectedScope])

  const handleSubmit = async () => {
    if (!selectedAccount) {
      toast.error("请选择账号")
      return
    }
    if (!selectedTask) {
      toast.error("请选择任务类型")
      return
    }
    if (selectedTask !== "submit" && !selectedScope) {
      toast.error("请选择同步范围")
      return
    }

    let finalRange = selectedScope || "";
    if (selectedTask === "syncList" && selectedScope === "custom") {
      if (!syncStart || !syncCount) {
        toast.error("请输入起点和个数")
        return
      }
      finalRange = `${syncStart}:${syncCount}`;
    }

    const account = accounts.find(acc => acc.node_id.toString() === selectedAccount);
    if (selectedTask === "syncOne") {
      if (account?.public.platform.toLowerCase() === "codeforces") {
        if (cfLink) {
          finalRange = cfLink;
        } else if (cfContestId && cfProblemId) {
          finalRange = `${cfContestId}${cfProblemId}`;
        } else {
          toast.error("请输入 Contest ID 和 Problem ID，或者给定链接")
          return
        }
      } else {
        // 非 Codeforces 的 syncOne 默认使用 selectedScope (1:50)
        finalRange = selectedScope || "1:50";
      }
    }

    setLoading(true)
    
    try {
      const payload: AssignTaskReq = {
        vjudge_node_id: Number(selectedAccount) as unknown as bigint,
        range: selectedTask === "submit" ? "submit" : finalRange,
        ws_id: socket.id ?? null,
      }
      const res = await postAssign({ data: payload })
      const taskData: any = res as any
      const taskId = taskData?.node_id ?? taskData?.data?.node_id
      const accountId = Number(selectedAccount)
      if (taskId && onSubmitSuccess) {
        onSubmitSuccess(taskId, accountId)
      } else if (taskId) {
        router.push(`/vjudge/task?id=${taskId}&account_id=${accountId}`)
      } else {
        toast.success("提交成功，任务已创建")
      }
    } catch (e) {
      console.error(e)
      toast.error("提交失败")
    } finally {
      setLoading(false)
    }
  }

  const tasks = [
    { label: "同步最近 (syncOne)", value: "syncOne", description: "同步最近提交的题目", scopes: [{ label: "1:50", value: "1:50" }] },
    { label: "同步列表 (syncList)", value: "syncList", description: "同步历史提交记录", scopes: [{ label: "全部 (all)", value: "all" }, { label: "自定义范围", value: "custom" }] },
    { label: "提交题目 (submit)", value: "submit", description: "提交新题目到远程平台", scopes: [] },
  ]

  const getTasksWithFilteredScopes = (baseTasks: typeof tasks, platform?: string) => {
    return baseTasks.map(task => {
      if (task.value === "syncOne" && platform?.toLowerCase() === "codeforces") {
        return { ...task, scopes: [] };
      }
      return task;
    });
  }

  const account = accounts.find(acc => acc.node_id.toString() === selectedAccount);

  const getFilteredTasks = () => {
    const account = accounts.find(acc => acc.node_id.toString() === selectedAccount);
    const platform = account?.public.platform?.toLowerCase();
    const processedTasks = getTasksWithFilteredScopes(tasks, account?.public.platform);

    if (!selectedAccount || !account || !platform) return processedTasks;

    const platformConfig = VJUDGE_CONFIG[platform];
    if (platformConfig) {
      const mode = String(account.public.remote_mode);
      const allowedTasks = platformConfig[mode];
      if (allowedTasks) {
        return processedTasks.filter(t => allowedTasks.includes(t.value));
      }
    }

    return processedTasks;
  }

  const filteredTasks = getFilteredTasks();

  return (
    <StandardCard title="新增任务">
      <div className="space-y-6">
        {accounts.length === 0 ? (
          <div className="p-4 border rounded-lg bg-destructive/10 text-destructive text-sm">
            暂无绑定的VJudge账号，无法同步数据。
            <div className="mt-2">
              <Link href="/vjudge/account" className="text-blue-600 hover:underline">
                前往管理账号绑定
              </Link>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">1. 选择账号</label>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((acc) => {
                    const handle = `${acc.public.iden} / ${acc.public.remote_mode}`;
                    const accountId = acc.node_id.toString()
                    const isSelected = selectedAccount === accountId
                    return (
                      <Badge
                        key={accountId}
                        variant={isSelected ? "default" : "outline"}
                        className={cn(
                          "cursor-pointer py-1.5 px-3 text-xs transition-all",
                          isSelected ? "shadow-sm" : "hover:bg-muted"
                        )}
                        onClick={() => {
                          setSelectedAccount(accountId)
                          setSelectedTask(null)
                          setSelectedScope(null)
                        }}
                      >
                        {acc.public.platform}: {handle}
                      </Badge>
                    )
                  })}
                </div>
              </div>

              {selectedAccount && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <label className="text-sm font-medium">2. 选择任务类型</label>
                  <div className="flex flex-wrap gap-2">
                    {filteredTasks.map((task) => {
                      const isSelected = selectedTask === task.value
                      return (
                        <Badge
                          key={task.value}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer py-1.5 px-3 text-xs transition-all",
                            isSelected ? "shadow-sm bg-green-600 hover:bg-green-700" : "hover:bg-muted"
                          )}
                          onClick={() => {
                            setSelectedTask(task.value)
                            if (task.scopes.length > 0) {
                              setSelectedScope(task.scopes[0].value)
                            } else {
                              setSelectedScope(null)
                            }
                          }}
                        >
                          {task.label}
                        </Badge>
                      )
                    })}
                  </div>
                  {selectedTask && (
                    <p className="text-[10px] text-muted-foreground ml-1">
                      {filteredTasks.find(t => t.value === selectedTask)?.description}
                    </p>
                  )}
                </div>
              )}

              {selectedTask && (filteredTasks.find(t => t.value === selectedTask)?.scopes.length || 0) > 0 && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <label className="text-sm font-medium">3. 选择同步范围</label>
                  <div className="flex flex-wrap gap-2">
                    {filteredTasks.find(t => t.value === selectedTask)?.scopes.map((scope) => {
                      const isSelected = selectedScope === scope.value
                      if (scope.value === "custom") {
                        return (
                          <Popover key={scope.value} open={customRangeOpen} onOpenChange={setCustomRangeOpen}>
                            <PopoverTrigger asChild>
                              <Badge
                                variant={isSelected ? "default" : "outline"}
                                className={cn(
                                  "cursor-pointer py-1.5 px-3 text-xs transition-all",
                                  isSelected ? "shadow-sm bg-blue-600 hover:bg-blue-700" : "hover:bg-muted"
                                )}
                                onClick={() => {
                                  setSelectedScope(scope.value)
                                  setCustomRangeOpen(true)
                                }}
                              >
                                {scope.label}
                              </Badge>
                            </PopoverTrigger>
                            <PopoverContent className="w-72 p-3" align="start">
                              <div className="space-y-2">
                                <label className="text-sm font-medium">输入范围</label>
                                <div className="flex gap-3">
                                  <div className="flex-1 space-y-1">
                                    <span className="text-[10px] text-muted-foreground">起点</span>
                                    <Input
                                      type="number"
                                      value={syncStart}
                                      onChange={(e) => setSyncStart(e.target.value)}
                                      placeholder="1"
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                  <div className="flex-1 space-y-1">
                                    <span className="text-[10px] text-muted-foreground">个数</span>
                                    <Input
                                      type="number"
                                      value={syncCount}
                                      onChange={(e) => setSyncCount(e.target.value)}
                                      placeholder="50"
                                      className="h-8 text-xs"
                                    />
                                  </div>
                                </div>
                                <div className="flex justify-end">
                                  <Button size="sm" variant="secondary" onClick={() => setCustomRangeOpen(false)}>
                                    确定
                                  </Button>
                                </div>
                              </div>
                            </PopoverContent>
                          </Popover>
                        )
                      }

                      return (
                        <Badge
                          key={scope.value}
                          variant={isSelected ? "default" : "outline"}
                          className={cn(
                            "cursor-pointer py-1.5 px-3 text-xs transition-all",
                            isSelected ? "shadow-sm bg-blue-600 hover:bg-blue-700" : "hover:bg-muted"
                          )}
                          onClick={() => setSelectedScope(scope.value)}
                        >
                          {scope.label}
                        </Badge>
                      )
                    })}
                  </div>
                </div>
              )}

              {selectedTask === "syncOne" && account?.public.platform.toLowerCase() === "codeforces" && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-1 duration-300">
                  <label className="text-sm font-medium">4. 输入题目信息</label>
                  <div className="space-y-4">
                    <div className="flex gap-4">
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] text-muted-foreground">Contest ID</span>
                        <Input
                          value={cfContestId}
                          onChange={(e) => setCfContestId(e.target.value)}
                          placeholder="例如: 1234"
                          className="h-8 text-xs"
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <span className="text-[10px] text-muted-foreground">Problem ID</span>
                        <Input
                          value={cfProblemId}
                          onChange={(e) => setCfProblemId(e.target.value)}
                          placeholder="例如: A"
                          className="h-8 text-xs"
                        />
                      </div>
                    </div>
                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t" />
                      </div>
                      <div className="relative flex justify-center text-[10px] uppercase">
                        <span className="bg-background px-2 text-muted-foreground">或者</span>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <span className="text-[10px] text-muted-foreground">题目链接</span>
                      <Input
                        value={cfLink}
                        onChange={(e) => setCfLink(e.target.value)}
                        placeholder="https://codeforces.com/contest/1234/problem/A"
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            {selectedScope === "all" && (
              <div className="p-3 border rounded-lg bg-yellow-50 text-yellow-800 text-[10px] leading-relaxed">
                注意：全部同步行为，每个远程帐号 5 天内仅允许执行一次。
              </div>
            )}

            <Button
              onClick={handleSubmit}
              disabled={
                loading ||
                !selectedAccount ||
                !selectedTask ||
                (selectedTask === "submit" ? false : (
                  (selectedTask === "syncOne" && account?.public.platform.toLowerCase() === "codeforces")
                  ? false
                  : !selectedScope
                ))
              }
              className="w-full"
            >
              {loading ? "提交中..." : "提交任务"}
            </Button>
          </>
        )}
      </div>
    </StandardCard>
  )
}
