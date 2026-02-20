"use client"

import { useState, useEffect } from "react"
import { StandardCard } from "@/components/card/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import Link from "next/link"
import { TrainingProblem } from "@rmjac/api-declare"

interface ProblemSubmission {
  problemId: string
  problemName: string
  edgeId: number
  problemNodeId: number
  status?: string
}

interface TrainingSubmissionsProps {
  problems: TrainingProblem[]
  statusMap: Map<number, string>
  selectedProblemId: string
}

export default function TrainingSubmissions({
  problems,
  statusMap,
  selectedProblemId
}: TrainingSubmissionsProps) {
  const [problemList, setProblemList] = useState<ProblemSubmission[]>([])

  // 递归提取所有题目
  const extractProblems = (
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
      // ExistTraining 不包含具体题目
    }
    return result
  }

  useEffect(() => {
    const extracted = extractProblems(problems)
    setProblemList(extracted)
  }, [problems])

  const selectedProblem = problemList.find(p => p.problemId === selectedProblemId)

  return (
    <StandardCard title="查看提交代码">
      <div className="space-y-4">
        {selectedProblem ? (
          <>
            <div className="border rounded-lg p-4 bg-muted/50">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold">题目：</h3>
                  <Link
                    href={`/problem/${selectedProblem.problemId}`}
                    className="text-blue-600 hover:text-blue-800 hover:underline"
                  >
                    {selectedProblem.problemName}
                  </Link>
                </div>
                {selectedProblem.status && (
                  <Badge variant={selectedProblem.status === "Accepted" ? "default" : "secondary"}>
                    {selectedProblem.status}
                  </Badge>
                )}
              </div>
            </div>

            <div className="border rounded-lg">
              <div className="border-b bg-muted/50 px-4 py-2">
                <h3 className="font-semibold">提交历史</h3>
              </div>
              <ScrollArea className="h-96">
                <div className="p-4">
                  <div className="text-center text-muted-foreground py-8">
                    正在加载提交记录...
                    <div className="text-xs mt-2">
                      需要调用 API: /api/record/list?problem_id={selectedProblem.problemId}
                    </div>
                  </div>
                </div>
              </ScrollArea>
            </div>
          </>
        ) : (
          <div className="text-center text-muted-foreground py-8">
            请在右侧边栏选择题目
          </div>
        )}
      </div>
    </StandardCard>
  )
}
