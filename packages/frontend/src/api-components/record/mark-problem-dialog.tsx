"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { postCreate } from "@/api/client/api_record_create"
import { Loader2 } from "lucide-react"
import type { JudgeStatus, JudgeResult } from "@rmjac/api-declare"

const JUDGE_STATUS_LIST: JudgeStatus[] = [
  "Accepted",
  "WrongAnswer",
  "TimeLimitExceeded",
  "MemoryLimitExceeded",
  "RuntimeError",
  "CompileError",
  "PresentationError",
  "Skipped",
  "Unknown",
  "Reject",
]

interface MarkProblemDialogProps {
  problemIden: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess?: () => void
}

export function MarkProblemDialog({ problemIden, open, onOpenChange, onSuccess }: MarkProblemDialogProps) {
  const [status, setStatus] = useState<JudgeStatus>("Accepted")
  const [score, setScore] = useState("100")
  const [time, setTime] = useState("0")
  const [memory, setMemory] = useState("0")
  const [language, setLanguage] = useState("C++")
  const [code, setCode] = useState("")
  const [message, setMessage] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState("")

  const isPassed = status === "Accepted"

  const handleSubmit = async () => {
    setSubmitting(true)
    setError("")
    try {
      const detail: JudgeResult = { "PassedOnly": isPassed }

      await postCreate({
        problem_iden: problemIden,
        record: {
          code: code || "",
          problem_id: 0,
          user_id: 0,
          language,
          judge_detail: {
            is_passed: isPassed,
            status,
            detail: {
              style: "Archive",
              score: Number(score) || 0,
              time: Number(time) || 0,
              memory: Number(memory) || 0,
            },
          },
          judge_time: new Date().toISOString(),
          judge_message: message,
        },
        detail,
      })

      onOpenChange(false)
      onSuccess?.()
    } catch (e: any) {
      setError(e?.message || "创建记录失败")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>标记题目 {problemIden}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>评测状态</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as JudgeStatus)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JUDGE_STATUS_LIST.map((s) => (
                  <SelectItem key={s} value={s}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-2">
              <Label>分数</Label>
              <Input type="number" value={score} onChange={(e) => setScore(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>时间 (ms)</Label>
              <Input type="number" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>内存 (MB)</Label>
              <Input type="number" value={memory} onChange={(e) => setMemory(e.target.value)} />
            </div>
          </div>

          <div className="space-y-2">
            <Label>语言</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="C++">C++</SelectItem>
                <SelectItem value="C">C</SelectItem>
                <SelectItem value="Java">Java</SelectItem>
                <SelectItem value="Python">Python</SelectItem>
                <SelectItem value="Rust">Rust</SelectItem>
                <SelectItem value="Go">Go</SelectItem>
                <SelectItem value="JavaScript">JavaScript</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>代码（可选）</Label>
            <textarea
              className="w-full min-h-20 rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="粘贴代码（可选）"
            />
          </div>

          <div className="space-y-2">
            <Label>备注信息（可选）</Label>
            <Input value={message} onChange={(e) => setMessage(e.target.value)} placeholder="评测备注信息" />
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline">取消</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={submitting}>
            {submitting && <Loader2 className="mr-2 size-4 animate-spin" />}
            提交
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
