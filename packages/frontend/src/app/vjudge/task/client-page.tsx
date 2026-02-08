"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter } from "next/navigation"
import { getTaskList } from "@/api/server/api_vjudge_tasks"
import { getMyAccounts } from "@/api/server/api_vjudge_my_accounts"
import { VjudgeNode, VjudgeTaskWithAccount } from "@rmjac/api-declare"
import {
  Loader2,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Circle,
  ArrowUpCircle,
  RefreshCw,
  Plus,
  ChevronLeft,
  ChevronRight,
} from "lucide-react"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { cn } from "@/lib/utils"
import { formatRelativeTime } from "@/components/vjudge/workflow-timeline"

// ==================== 状态配置 ====================

type TicketStatus = "open" | "closed"

interface TicketStatusConfig {
  label: string
  ticketStatus: TicketStatus
  color: string
  icon: React.ElementType
}

const TICKET_STATUS_MAP: Record<string, TicketStatusConfig> = {
  pending: {
    label: "已创建",
    ticketStatus: "open",
    color: "text-green-600",
    icon: Circle,
  },
  dispatching: {
    label: "调度中",
    ticketStatus: "open",
    color: "text-blue-600",
    icon: ArrowUpCircle,
  },
  running: {
    label: "运行中",
    ticketStatus: "open",
    color: "text-yellow-600",
    icon: Loader2,
  },
  waiting: {
    label: "等待中",
    ticketStatus: "open",
    color: "text-yellow-600",
    icon: Circle,
  },
  completed: {
    label: "完成",
    ticketStatus: "closed",
    color: "text-purple-600",
    icon: CheckCircle2,
  },
  failed: {
    label: "失败",
    ticketStatus: "closed",
    color: "text-red-600",
    icon: XCircle,
  },
  cron_online: {
    label: "定时运行中",
    ticketStatus: "open",
    color: "text-emerald-600",
    icon: RefreshCw,
  },
  cron_error: {
    label: "定时任务出错",
    ticketStatus: "closed",
    color: "text-red-600",
    icon: AlertCircle,
  },
}

function getTicketConfig(status: string): TicketStatusConfig {
  return (
    TICKET_STATUS_MAP[status] ?? {
      label: status,
      ticketStatus: "open" as TicketStatus,
      color: "text-gray-500",
      icon: Circle,
    }
  )
}

// ==================== 工单卡片 ====================

function TicketCard({
  ticket,
  onClick,
}: {
  ticket: VjudgeTaskWithAccount
  onClick: () => void
}) {
  const config = getTicketConfig(ticket.task.public.status)
  const StatusIcon = config.icon
  const isCron = ticket.task.public.status.startsWith("cron_")
  const serviceName = ticket.task.public.service_name || "(legacy)"

  // 从 service_name 解析出可读标题
  const displayTitle =
    serviceName !== "(legacy)"
      ? serviceName.split(":").slice(0, 2).join(":")
      : `${ticket.platform}:sync`

  return (
    <div
      onClick={onClick}
      className="flex items-start gap-3 p-4 border rounded-lg hover:bg-muted/50 cursor-pointer transition-colors group"
    >
      {/* 状态图标 */}
      <div className="mt-0.5 shrink-0">
        <StatusIcon
          className={cn(
            "h-5 w-5",
            config.color,
            config.icon === Loader2 && "animate-spin"
          )}
        />
      </div>

      {/* 主内容 */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm group-hover:text-primary transition-colors truncate">
            {displayTitle}
          </span>
          <span className="text-xs text-muted-foreground font-mono">
            #{ticket.task.node_id.toString()}
          </span>
          {isCron && (
            <Badge
              variant="outline"
              className="text-[10px] px-1.5 py-0 border-emerald-200 text-emerald-600"
            >
              Cron
            </Badge>
          )}
        </div>
        <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
          <span>@{ticket.handle}</span>
          <span>·</span>
          <Badge variant="outline" className="text-[10px] px-1.5 py-0">
            {ticket.platform}
          </Badge>
          <span>·</span>
          <span>{formatRelativeTime(ticket.task.public.created_at)}</span>
        </div>
      </div>

      {/* 右侧状态 */}
      <Badge
        variant="outline"
        className={cn("shrink-0 text-[10px] px-1.5 py-0.5", config.color)}
      >
        {config.label}
      </Badge>
    </div>
  )
}

// ==================== 分页器 ====================

function Pagination({
  page,
  totalPages,
  onPageChange,
}: {
  page: number
  totalPages: number
  onPageChange: (p: number) => void
}) {
  if (totalPages <= 1) return null

  return (
    <div className="flex items-center justify-center gap-2 mt-4">
      <Button
        variant="outline"
        size="sm"
        disabled={page <= 1}
        onClick={() => onPageChange(page - 1)}
      >
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-sm text-muted-foreground">
        {page} / {totalPages}
      </span>
      <Button
        variant="outline"
        size="sm"
        disabled={page >= totalPages}
        onClick={() => onPageChange(page + 1)}
      >
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  )
}

// ==================== 主组件 ====================

const PAGE_SIZE = 20

export function VjudgePageContent() {
  const router = useRouter()
  const [filter, setFilter] = useState<"all" | "open" | "closed">("all")
  const [accountFilter, setAccountFilter] = useState<string>("all")
  const [page, setPage] = useState(1)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")
  const [tickets, setTickets] = useState<VjudgeTaskWithAccount[]>([])
  const [total, setTotal] = useState(0)
  const [accounts, setAccounts] = useState<VjudgeNode[]>([])

  // 加载账号列表
  useEffect(() => {
    getMyAccounts()
      .then((res) => setAccounts(res.data))
      .catch(() => {})
  }, [])

  // 加载任务列表
  const fetchTickets = useCallback(async () => {
    setLoading(true)
    setError("")
    try {
      const statusParam = filter === "all" ? undefined : filter
      const result = await getTaskList({
        status: statusParam as "open" | "closed" | undefined,
        page,
        limit: PAGE_SIZE,
      })
      const listResult = result.data
      let data = listResult.data
      // 前端额外过滤：按账号
      if (accountFilter !== "all") {
        data = data.filter(
          (t) => t.account_node_id.toString() === accountFilter
        )
      }
      setTickets(data)
      setTotal(Number(listResult.total))
    } catch (err) {
      console.error(err)
      setError("加载任务列表失败")
    } finally {
      setLoading(false)
    }
  }, [filter, page, accountFilter])

  useEffect(() => {
    fetchTickets()
  }, [fetchTickets])

  // 切换筛选时重置分页
  useEffect(() => {
    setPage(1)
  }, [filter, accountFilter])

  const totalPages = Math.ceil(total / PAGE_SIZE)

  return (
    <div className="animate-in fade-in duration-300 space-y-4">
      {/* 标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">工单列表</h2>
          <p className="text-sm text-muted-foreground mt-0.5">
            管理你的 VJudge 同步和提交任务
          </p>
        </div>
        <Button size="sm" onClick={() => router.push("/vjudge/task?new=1")}>
          <Plus className="h-4 w-4 mr-1" />
          创建工单
        </Button>
      </div>

      {/* 工具栏 */}
      <div className="flex items-center gap-3 flex-wrap">
        <Tabs
          value={filter}
          onValueChange={(v) => setFilter(v as "all" | "open" | "closed")}
        >
          <TabsList>
            <TabsTrigger value="all">
              全部
              <Badge
                variant="secondary"
                className="ml-1.5 text-[10px] px-1.5 py-0"
              >
                {total}
              </Badge>
            </TabsTrigger>
            <TabsTrigger value="open">
              <Circle className="h-3 w-3 mr-1 text-green-600" />
              Open
            </TabsTrigger>
            <TabsTrigger value="closed">
              <CheckCircle2 className="h-3 w-3 mr-1 text-purple-600" />
              Closed
            </TabsTrigger>
          </TabsList>
        </Tabs>

        <Select value={accountFilter} onValueChange={setAccountFilter}>
          <SelectTrigger className="w-[180px] h-8 text-xs">
            <SelectValue placeholder="全部账号" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">全部账号</SelectItem>
            {accounts.map((acc) => (
              <SelectItem
                key={acc.node_id.toString()}
                value={acc.node_id.toString()}
              >
                {acc.public.platform} · @{acc.public.iden}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* 错误提示 */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>错误</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* 列表 */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-16">
          <Loader2 className="h-8 w-8 animate-spin text-primary mb-4" />
          <p className="text-sm text-muted-foreground">加载中...</p>
        </div>
      ) : tickets.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <Circle className="h-12 w-12 mb-4 opacity-30" />
          <p className="text-sm">暂无工单</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-4"
            onClick={() => router.push("/vjudge/task?new=1")}
          >
            <Plus className="h-4 w-4 mr-1" />
            创建第一个工单
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.task.node_id.toString()}
              ticket={ticket}
              onClick={() =>
                router.push(`/vjudge/task/${ticket.task.node_id}`)
              }
            />
          ))}
        </div>
      )}

      {/* 分页 */}
      <Pagination
        page={page}
        totalPages={totalPages}
        onPageChange={setPage}
      />
    </div>
  )
}
