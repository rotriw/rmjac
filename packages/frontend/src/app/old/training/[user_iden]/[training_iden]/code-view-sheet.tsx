"use client"

import * as React from "react"
import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Code2, FileCode, Calendar, Award, ChevronRight } from "lucide-react"
import { TrainingProblem } from "@rmjac/api-declare"
import { RecordStatusBadge } from "@/api-components/record"
import Link from "next/link"

interface ProblemSubmission {
  problemId: string
  problemName: string
  edgeId: number
  status?: string
}

interface CodeViewSheetProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  problems: TrainingProblem[]
  statusMap: Map<number, string>
}

export function CodeViewSheet({
  open,
  onOpenChange,
  problems,
  statusMap,
}: CodeViewSheetProps) {
  const [selectedProblemId, setSelectedProblemId] = useState<string>("")
  const [problemList, setProblemList] = useState<ProblemSubmission[]>([])

  // 递归提取所有题目
  const extractProblems = (
    problemList: TrainingProblem[],
    result: ProblemSubmission[] = []
  ): ProblemSubmission[] => {
    for (const problem of problemList) {
      if ("ProblemIden" in problem) {
        const [edgeId, problemIden, problemNodeId] = problem.ProblemIden
        const status = statusMap.get(Number(problemNodeId))
        result.push({
          problemId: problemIden,
          problemName: problemIden,
          edgeId: Number(edgeId),
          status,
        })
      } else if ("ProblemTraining" in problem) {
        const trainingList = problem.ProblemTraining
        extractProblems(trainingList.own_problem, result)
      }
    }
    return result
  }

  useEffect(() => {
    const extracted = extractProblems(problems)
    setProblemList(extracted)
    if (extracted.length > 0 && !selectedProblemId) {
      setSelectedProblemId(extracted[0].problemId)
    }
  }, [problems])

  const selectedProblem = problemList.find(p => p.problemId === selectedProblemId)

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Code2 className="w-5 h-5" />
            查看提交代码
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          {/* 题目选择器 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">选择题目</label>
            <Select value={selectedProblemId} onValueChange={setSelectedProblemId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="选择一个题目" />
              </SelectTrigger>
              <SelectContent>
                {problemList.map((problem) => (
                  <SelectItem key={problem.problemId} value={problem.problemId}>
                    <div className="flex items-center gap-2">
                      <span>{problem.problemName}</span>
                      {problem.status === "Accepted" && (
                        <Badge className="bg-green-600 text-white text-xs">已通过</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 题目信息 */}
          {selectedProblem && (
            <div className="border rounded-lg p-4 bg-gray-50 dark:bg-gray-900">
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-lg">{selectedProblem.problemName}</h3>
                <Link href={`/problem/${selectedProblem.problemId}`} target="_blank">
                  <Button variant="outline" size="sm">
                    查看题目
                    <ChevronRight className="w-4 h-4 ml-1" />
                  </Button>
                </Link>
              </div>
              {selectedProblem.status && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">状态:</span>
                  <Badge className={selectedProblem.status === "Accepted" ? "bg-green-600" : "bg-orange-600"}>
                    {selectedProblem.status === "Accepted" ? "已通过" : "未通过"}
                  </Badge>
                </div>
              )}
            </div>
          )}

          {/* 提交记录列表 */}
          <div className="space-y-2">
            <label className="text-sm font-medium">提交记录</label>
            <ScrollArea className="h-[400px] border rounded-lg">
              <div className="p-4 space-y-3">
                {selectedProblem ? (
                  // TODO: 这里需要调用 API 获取该题目的提交记录
                  // 暂时显示占位符
                  <div className="text-center py-8 text-gray-500">
                    <FileCode className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">正在加载提交记录...</p>
                    <p className="text-xs text-gray-400 mt-1">
                      需要调用 API: /api/record/list?problem_id={selectedProblem.problemId}
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <p className="text-sm">请先选择一个题目</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  )
}
