"use client"
import { RECORD_STATUS_COLOR_MAP } from "@/api-components/record/status-utils";
import { socket } from "@/lib/socket";
import { useWorkflowStatus, type WorkflowStatusUpdate } from "@/hooks/use-workflow-status";
import { useEffect, useReducer, useState, useRef, useMemo, useCallback } from "react";
import { StandardCard } from "@/components/card/card";
import { Loader2, Clock, CheckCircle2, XCircle, CalendarClock, Info, Terminal, History, Workflow, ArrowRight } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

const reflect: Record<string, string> = {
  "waiting_number": "正在等待远端服务器传回数据...",
  "updating": "正在更新提交状态...",
  "completed": "任务已完成",
  "failed": "任务失败",
  "cron_online": "定时任务运行中",
  "pending": "任务已创建，等待调度...",
  "dispatching": "正在调度到边缘服务...",
}

/** 工作流状态类型到展示信息的映射 */
const workflowStatusTypeMap: Record<string, { label: string; color: string; icon: string }> = {
  "Initial": { label: "初始化", color: "text-gray-500", icon: "⏳" },
  "Dispatching": { label: "调度中", color: "text-blue-500", icon: "🔄" },
  "AccountVerified": { label: "账号已验证", color: "text-green-500", icon: "✅" },
  "ProblemFetched": { label: "题目已获取", color: "text-cyan-500", icon: "📥" },
  "ProblemSynced": { label: "题目已同步", color: "text-indigo-500", icon: "🔗" },
  "SubmissionCreated": { label: "提交已创建", color: "text-purple-500", icon: "📝" },
  "SubmissionJudged": { label: "评测已完成", color: "text-emerald-500", icon: "⚖️" },
  "Completed": { label: "已完成", color: "text-green-600", icon: "🎉" },
  "Error": { label: "错误", color: "text-red-500", icon: "❌" },
}

interface CronInfo {
  expression: string;
  taskType: string;
  taskDetails: string;
  execHistory: Array<{
    success: boolean;
    message: string;
    timestamp?: string;
  }>;
}

/**
 * 解析 cron 表达式为易读格式
 */
function parseCronExpression(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  
  // 处理标准 cron 格式 (秒 分 时 日 月 周 年)
  if (parts.length >= 6) {
    const [seconds, minutes, hours, dayOfMonth, month, dayOfWeek] = parts;
    
    // 常见模式匹配
    if (seconds === "0" && minutes === "0" && hours === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      return "每小时整点执行";
    }
    if (seconds === "0" && minutes === "0" && hours === "0" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      return "每天 00:00 执行";
    }
    if (minutes !== "*" && hours !== "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
      return `每天 ${hours.padStart(2, '0')}:${minutes.padStart(2, '0')} 执行`;
    }
    if (seconds !== "*" && minutes === "*" && hours === "*") {
      return `每分钟的第 ${seconds} 秒执行`;
    }
    if (minutes !== "*" && hours === "*") {
      return `每小时的第 ${minutes} 分钟执行`;
    }
    
    return `Cron: ${cron}`;
  }
  
  return `Cron: ${cron}`;
}

/**
 * 解析日志中的 cron task 信息
 * 支持多种日志格式：
 * - cron:表达式
 * - [TASK_INFO] ... [TASK_DONE] 区块
 * - [CRON_TASK_SUCCESS] / [CRON_TASK_ERROR] 执行记录
 */
function parseCronLog(log: string): CronInfo | null {
  if (!log) return null;
  
  const lines = log.split('\n');
  let cronExpression = "";
  let taskType = "";
  let taskDetails = "";
  let inTaskInfo = false;
  const taskInfoLines: string[] = [];
  const execHistory: CronInfo["execHistory"] = [];
  
  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;
    
    // 解析 cron 表达式
    if (trimmedLine.startsWith("cron:")) {
      cronExpression = trimmedLine.substring(5).trim();
      continue;
    }
    
    // 解析任务信息区块
    if (trimmedLine.startsWith("[TASK_INFO]") || trimmedLine === "[TASK_INFO]") {
      inTaskInfo = true;
      continue;
    }
    if (trimmedLine.startsWith("[TASK_DONE]") || trimmedLine === "[TASK_DONE]") {
      inTaskInfo = false;
      continue;
    }
    
    if (inTaskInfo) {
      taskInfoLines.push(trimmedLine);
      continue;
    }
    
    // 解析执行历史 - 支持多种格式
    // 格式1: [CRON_TASK_SUCCESS] message
    // 格式2: [CRON_TASK_ERROR] message
    if (trimmedLine.startsWith("[CRON_TASK_SUCCESS]")) {
      const message = trimmedLine.substring("[CRON_TASK_SUCCESS]".length).trim();
      execHistory.push({
        success: true,
        message: message || "执行成功",
      });
      continue;
    }
    
    if (trimmedLine.startsWith("[CRON_TASK_ERROR]")) {
      const message = trimmedLine.substring("[CRON_TASK_ERROR]".length).trim();
      execHistory.push({
        success: false,
        message: message || "执行失败",
      });
      continue;
    }
  }
  
  // 解析 TASK_INFO 区块内容
  if (taskInfoLines.length > 0) {
    taskType = taskInfoLines[0] || "";
    if (taskInfoLines.length > 1) {
      // 尝试将剩余内容解析为 JSON
      const detailsStr = taskInfoLines.slice(1).join('\n');
      try {
        const parsed = JSON.parse(detailsStr);
        taskDetails = JSON.stringify(parsed, null, 2);
      } catch {
        taskDetails = detailsStr;
      }
    }
  }
  
  // 如果有 cron 表达式或执行历史，视为 cron task
  const hasCronInfo = cronExpression !== "" || execHistory.length > 0;
  
  if (!hasCronInfo) {
    return null;
  }
  
  return {
    expression: cronExpression || "0 0 * * * * *",
    taskType: taskType || "unknown",
    taskDetails,
    execHistory,
  };
}

/**
 * 任务类型映射
 */
const taskTypeMap: Record<string, { label: string; color: string }> = {
  "upload_recent": { label: "定时同步", color: "bg-blue-500" },
  "unknown": { label: "未知任务", color: "bg-gray-500" },
};

interface ViewVjudgeMessageProps {
  initialLog?: string;
  initialStatus?: string;
  /** 工作流任务 ID，用于监听实时工作流状态更新 */
  workflowTaskId?: string | null;
}

export const ViewVjudgeMessage = ({ initialLog, initialStatus, workflowTaskId }: ViewVjudgeMessageProps) => {
  const logEndRef = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState<string>(initialStatus || "waiting");
  const [currMessage, setCurrMessage] = useState<string>("");
  const [background, setBackground] = useState<string>(RECORD_STATUS_COLOR_MAP["Waiting"]);

  function add_tot(old: number, n: number) {
    return old + n;
  }

  function add_cur(old: number, n: number) {
    return old + n;
  }
  
  function add_meesage(old: string, msg: string) {
    return old + msg + '\n';
  }


  const [totalNumber, setTotalNumber] = useReducer(add_tot, 0);
  const [currentNumber, setCurrentNumber] = useReducer(add_cur, 0);
  const [message, setMessage] = useReducer(add_meesage, initialLog || "");

  // 解析 cron 信息
  const cronInfo = useMemo(() => parseCronLog(message), [message]);
  const isCronTask = initialStatus === "cron_online" || cronInfo !== null;

  // 工作流状态追踪
  const [workflowUpdates, setWorkflowUpdates] = useState<WorkflowStatusUpdate[]>([]);

  function add_step(msg: string) {
    setCurrentNumber(1);
    setMessage(msg);
  }

  // 监听工作流状态更新
  const handleWorkflowUpdate = useCallback((update: WorkflowStatusUpdate) => {
    setWorkflowUpdates(prev => [...prev, update]);
    const statusInfo = workflowStatusTypeMap[update.status_type];
    const label = statusInfo?.label || update.status_type;
    add_step(`[WORKFLOW] ${statusInfo?.icon || "📌"} ${label} (${update.timestamp})`);
    setCurrMessage(label);

    if (update.is_final) {
      if (update.success) {
        setStatus("completed");
        setBackground(RECORD_STATUS_COLOR_MAP["Accepted"]);
      } else {
        setStatus("failed");
        setBackground(RECORD_STATUS_COLOR_MAP["Wrong Answer"]);
        if (update.error) {
          add_step(`[ERROR] ${update.error}`);
        }
      }
    } else {
      setBackground(RECORD_STATUS_COLOR_MAP["Waiting"]);
    }
  }, []);

  const { latestStatus: workflowLatest } = useWorkflowStatus({
    taskId: workflowTaskId,
    onUpdate: handleWorkflowUpdate,
  });

  useEffect(() => {
    if (initialStatus === "completed") {
      setStatus("completed");
      setBackground(RECORD_STATUS_COLOR_MAP["Accepted"]);
    } else if (initialStatus === "cron_online") {
      setStatus("cron_online");
      setBackground(RECORD_STATUS_COLOR_MAP["Accepted"]);
    } else if (initialStatus === "pending" || initialStatus === "dispatching") {
      setStatus(initialStatus);
      setBackground(RECORD_STATUS_COLOR_MAP["Waiting"]);
    } else if (initialStatus === "failed") {
      setStatus("failed");
      setBackground(RECORD_STATUS_COLOR_MAP["Wrong Answer"]);
    }
  }, [initialStatus]);

  useEffect(() => {
    if (logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [message]);

  useEffect(() => {
    function onSubmit(ndata: string | { n?: number; m?: string; s: number; t?: number }) {
      const data: {
        n?: number;
        m?: string;
        s: number;
        t?: number;
      } = typeof ndata === 'string' ? JSON.parse(ndata) : ndata;
      
      console.log("Received submission update:", data);
      if (data.s === 0) { // update task.
        setStatus("updating");
        setTotalNumber(data.n || 0);
        setBackground(RECORD_STATUS_COLOR_MAP["Accepted"]);
      } else if (data.s === 3) { // task completed
        setStatus("completed");
        setBackground(RECORD_STATUS_COLOR_MAP["Accepted"]);
      } else if (data.s === 1) {
        add_step(`[ERROR] ${data.m ? data.m : ""}`);
        setCurrMessage(data.m || "?");
      } else if (data.s === 2) {
        add_step(`[SUCCESS] ${data.m ? data.m : ""}`);
        setCurrMessage(data.m || "?");
      }
    }
    socket.on("submission_update", onSubmit);
    return () => {
      socket.off('submission_update', onSubmit);
    };
  }, []);

  const percentage = totalNumber > 0 ? Math.min(100, Math.max(0, (currentNumber / totalNumber) * 100)) : 0;

  // 渲染 Cron Task 专属视图
  if (isCronTask && cronInfo) {
    const taskConfig = taskTypeMap[cronInfo.taskType] || taskTypeMap["unknown"];
    const recentHistory = cronInfo.execHistory.slice(-10).reverse(); // 最近 10 条，倒序
    const successCount = cronInfo.execHistory.filter(h => h.success).length;
    const failCount = cronInfo.execHistory.filter(h => !h.success).length;

    return (
      <div className="space-y-4">
        {/* Cron 状态卡片 */}
        <div className="relative w-full rounded-lg overflow-hidden border bg-gradient-to-br from-emerald-500/5 to-cyan-500/5">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-emerald-500/10">
                  <CalendarClock className="size-6 text-emerald-500" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold">定时任务</h3>
                  <p className="text-sm text-muted-foreground">{parseCronExpression(cronInfo.expression)}</p>
                </div>
              </div>
              <Badge variant="outline" className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <Clock className="size-3 mr-1" />
                运行中
              </Badge>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
              {/* 任务类型 */}
              <div className="p-4 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <Info className="size-4" />
                  任务类型
                </div>
                <Badge className={cn("mt-1", taskConfig.color)}>
                  {taskConfig.label}
                </Badge>
              </div>

              {/* 成功次数 */}
              <div className="p-4 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <CheckCircle2 className="size-4 text-green-500" />
                  成功执行
                </div>
                <span className="text-2xl font-bold text-green-500">{successCount}</span>
                <span className="text-sm text-muted-foreground ml-1">次</span>
              </div>

              {/* 失败次数 */}
              <div className="p-4 rounded-lg bg-background/50 border">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-1">
                  <XCircle className="size-4 text-red-500" />
                  执行失败
                </div>
                <span className="text-2xl font-bold text-red-500">{failCount}</span>
                <span className="text-sm text-muted-foreground ml-1">次</span>
              </div>
            </div>

            {/* Cron 表达式详情 */}
            <div className="mt-4 p-3 rounded-lg bg-muted/30 border border-dashed">
              <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
                <Terminal className="size-3" />
                Cron 表达式
              </div>
              <code className="text-xs font-mono bg-background px-2 py-1 rounded">
                {cronInfo.expression}
              </code>
            </div>
          </div>
        </div>

        {/* 任务详情 */}
        {cronInfo.taskDetails && (
          <StandardCard title="任务配置">
            <div className="bg-neutral-950 rounded-sm p-4 font-mono text-xs text-neutral-400 max-h-[200px] overflow-y-auto border border-neutral-800">
              <pre className="whitespace-pre-wrap break-words leading-relaxed">
                {cronInfo.taskDetails}
              </pre>
            </div>
          </StandardCard>
        )}

        {/* 执行历史 */}
        <StandardCard title="执行历史">
          {recentHistory.length > 0 ? (
            <div className="space-y-2">
              {recentHistory.map((record, index) => (
                <div
                  key={index}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg border transition-colors",
                    record.success 
                      ? "bg-green-500/5 border-green-500/20" 
                      : "bg-red-500/5 border-red-500/20"
                  )}
                >
                  {record.success ? (
                    <CheckCircle2 className="size-4 text-green-500 mt-0.5 shrink-0" />
                  ) : (
                    <XCircle className="size-4 text-red-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Badge 
                        variant="outline" 
                        className={cn(
                          "text-[10px]",
                          record.success ? "text-green-600" : "text-red-600"
                        )}
                      >
                        {record.success ? "成功" : "失败"}
                      </Badge>
                      <span className="text-[10px] text-muted-foreground">
                        #{cronInfo.execHistory.length - index}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground break-words">
                      {record.message || "无详细信息"}
                    </p>
                  </div>
                </div>
              ))}
              {cronInfo.execHistory.length > 10 && (
                <div className="text-center text-xs text-muted-foreground py-2">
                  仅显示最近 10 条记录，共 {cronInfo.execHistory.length} 条
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <History className="size-8 mb-2 opacity-30" />
              <p className="text-sm">暂无执行记录</p>
              <p className="text-xs">等待定时任务首次执行...</p>
            </div>
          )}
        </StandardCard>

        {/* 原始日志 */}
        <StandardCard title="原始日志">
          <div className="bg-neutral-950 rounded-sm p-4 font-mono text-xs text-neutral-400 min-h-[100px] max-h-[200px] overflow-y-auto border border-neutral-800">
            {message ? (
              <div className="space-y-1">
                <pre className="whitespace-pre-wrap break-words leading-relaxed">
                  {message}
                </pre>
                <div ref={logEndRef} />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full opacity-30 italic">
                暂无日志输出
              </div>
            )}
          </div>
        </StandardCard>
      </div>
    );
  }

  // 普通任务视图（原有逻辑）
  return (
    <div className="space-y-4">
      <div className="relative w-full min-h-[120px] rounded-sm overflow-hidden bg-muted/30 border border-dashed">
        {/* Progress Bar Layer */}
        <div
            className="absolute top-0 left-0 h-full transition-all duration-700 ease-in-out opacity-20"
            style={{
                width: `${totalNumber > 0 ? percentage : 100}%`,
                background: background
            }}
        />
        
        {/* Content Layer */}
        <div className="relative z-10 p-6 h-full flex flex-col justify-center items-center text-center">
          <div
            className="text-2xl font-bold mb-2 transition-colors duration-500"
            style={{ color: background }}
          >
            {reflect[status] || "正在处理..."}
          </div>
          
          {totalNumber > 0 || status === "completed" || status === "failed" ? (
            <div className="space-y-2 w-full max-w-md">
              {totalNumber > 0 && (
                <>
                  <div className="flex justify-between text-xs font-mono text-muted-foreground">
                    <span>进度: {currentNumber} / {totalNumber}</span>
                    <span>{Math.round(percentage)}%</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                    <div
                      className="h-full transition-all duration-500"
                      style={{ width: `${percentage}%`, background: background }}
                    />
                  </div>
                </>
              )}
              <div className="text-xs text-muted-foreground italic truncate">
                {currMessage || (status === "completed" ? "所有操作已成功完成" : "")}
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="size-4 animate-spin" />
              等待远端响应...
            </div>
          )}
        </div>
      </div>

      {/* 工作流状态时间线 */}
      {workflowUpdates.length > 0 && (
        <StandardCard title="工作流状态">
          <div className="relative space-y-0">
            {workflowUpdates.map((update, idx) => {
              const statusInfo = workflowStatusTypeMap[update.status_type];
              const isLast = idx === workflowUpdates.length - 1;
              const isFinalSuccess = update.is_final && update.success;
              const isFinalError = update.is_final && !update.success;

              return (
                <div key={idx} className="flex items-start gap-3 relative">
                  {/* 时间线竖线 */}
                  {!isLast && (
                    <div className="absolute left-[11px] top-6 bottom-0 w-px bg-border" />
                  )}
                  {/* 节点圆点 */}
                  <div className={cn(
                    "mt-1.5 shrink-0 size-[22px] rounded-full flex items-center justify-center text-[10px] border-2",
                    isFinalSuccess ? "border-green-500 bg-green-500/10" :
                    isFinalError ? "border-red-500 bg-red-500/10" :
                    isLast ? "border-blue-500 bg-blue-500/10 animate-pulse" :
                    "border-muted-foreground/30 bg-muted"
                  )}>
                    {statusInfo?.icon || "📌"}
                  </div>
                  {/* 内容 */}
                  <div className="flex-1 pb-4">
                    <div className="flex items-center gap-2">
                      <span className={cn("text-sm font-medium", statusInfo?.color || "text-foreground")}>
                        {statusInfo?.label || update.status_type}
                      </span>
                      {update.is_final && (
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-[9px] px-1 h-4",
                            update.success
                              ? "bg-green-500/10 text-green-600 border-green-500/20"
                              : "bg-red-500/10 text-red-600 border-red-500/20"
                          )}
                        >
                          {update.success ? "最终 - 成功" : "最终 - 失败"}
                        </Badge>
                      )}
                    </div>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {new Date(update.timestamp).toLocaleString()}
                    </p>
                    {update.error && (
                      <p className="text-[10px] text-red-500 mt-1">错误: {update.error}</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </StandardCard>
      )}

      <StandardCard title="执行日志">
        <div className="bg-neutral-950 rounded-sm p-4 font-mono text-xs text-neutral-400 min-h-[200px] max-h-[400px] overflow-y-auto border border-neutral-800">
          {message ? (
            <div className="space-y-1">
              <pre className="whitespace-pre-wrap break-words leading-relaxed">
                {message}
              </pre>
              <div ref={logEndRef} />
            </div>
          ) : (
            <div className="flex items-center justify-center h-full opacity-30 italic">
              暂无日志输出
            </div>
          )}
        </div>
      </StandardCard>
    </div>
  );
}
