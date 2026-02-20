"use client"

import { useState, useEffect } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { StandardCard } from "@/components/card/card"
import { TreeTable, TreeTableNode } from "@/components/table/treetable"
import { Select, SelectItem } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
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

interface TrainingClientProps {
  treeData: TreeTableNode[]
  problems: TrainingProblem[]
  statusMap: Map<number, string>
  description: string
}

export default function TrainingClient({
  treeData,
  problems,
  statusMap,
  description
}: TrainingClientProps) {
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
    if (extracted.length > 0) {
      setSelectedProblemId(extracted[0].problemId)
    }
  }, [problems])

  const selectedProblem = problemList.find(p => p.problemId === selectedProblemId)

  return (
    <Tabs defaultValue="problems" className="mt-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="problems">题目列表</TabsTrigger>
        <TabsTrigger value="submissions">提交记录</TabsTrigger>
      </TabsList>
      
      <TabsContent value="problems">
        <StandardCard title="简介">
          <div className="prose max-w-none mb-6">
            <p>{description}</p>
          </div>
        </StandardCard>

        <div className="rounded-md border-sm mt-6">
          {treeData.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              暂无题目
            </div>
          ) : (
            <TreeTable data={treeData} />
          )}
        </div>
      </TabsContent>
      
      <TabsContent value="submissions">
        <StandardCard title="查看提交代码">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>选择题目</Label>
              <Select 
                value={selectedProblemId} 
                onValueChange={setSelectedProblemId}
              >
                <SelectItem value="" disabled>
                  请选择题目
                </SelectItem>
                {problemList.map((problem) => (
                  <SelectItem key={problem.edgeId} value={problem.problemId}>
                    <div className="flex items-center gap-2">
                      <span>{problem.problemName}</span>
                      {problem.status === "Accepted" && (
                        <Badge className="bg-green-600 text-white">✓</Badge>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </Select>
            </div>

            {selectedProblem && (
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
            )}

            <div className="border rounded-lg">
              <div className="border-b bg-muted/50 px-4 py-2">
                <h3 className="font-semibold">提交历史</h3>
              </div>
              <ScrollArea className="h-96">
                <div className="p-4">
                  <div className="text-center text-muted-foreground py-8">
                    正在加载提交记录...
                  </div>
                </div>
              </ScrollArea>
            </div>
          </div>
        </StandardCard>
      </TabsContent>
    </Tabs>
  )
}
