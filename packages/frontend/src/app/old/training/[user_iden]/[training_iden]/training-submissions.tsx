"use client"

import { useState, useEffect } from "react"
import { StandardCard } from "@/components/card/card"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import Link from "next/link"
import { TrainingProblem, RecordListItem } from "@rmjac/api-declare"
import { getList as getRecordList } from "@/api/client/api_record_list"
import RecordDetail from "./record-detail"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"

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
  const [records, setRecords] = useState<RecordListItem[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [selectedRecordId, setSelectedRecordId] = useState<string | null>(null)

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
        extractProblems(problem.ProblemTraining[1].own_problem, result)
      }
      // ExistTraining 不包含具体题目
    }
    return result
  }

  useEffect(() => {
    const extracted = extractProblems(problems)
    setProblemList(extracted)
  }, [problems])

  // 获取选中题目的提交记录
  useEffect(() => {
    if (!selectedProblemId) {
      setRecords([])
      setSelectedRecordId(null)
      return
    }

    const fetchRecords = async () => {
      try {
        setIsLoading(true)
        const response = await getRecordList({
          problem: selectedProblemId,
          status: 100,
          per_page: 50
        })
        setRecords(response.records)
        // 自动选中第一条记录
        if (response.records.length > 0) {
          setSelectedRecordId(String(response.records[0].edge.record_node_id))
        } else {
          setSelectedRecordId(null)
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "获取提交记录失败"
        toast.error(msg)
        setRecords([])
        setSelectedRecordId(null)
      } finally {
        setIsLoading(false)
      }
    }

    fetchRecords()
  }, [selectedProblemId])

  const selectedProblem = problemList.find(p => p.problemId === selectedProblemId)
  const selectedRecord = records.find(r => String(r.edge.record_node_id) === selectedRecordId)

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

            {isLoading ? (
              <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground">
                <Loader2 className="size-4 animate-spin" />
                加载中...
              </div>
            ) : records.length > 0 ? (
              <Tabs value={selectedRecordId || ""} onValueChange={setSelectedRecordId} className="w-auto">
                <ScrollArea className="border rounded-lg">
                  <TabsList className="inline-flex w-full justify-start gap-2 p-2 bg-transparent border-0">
                    {records.map((record) => (
                      <TabsTrigger 
                        key={record.edge.record_node_id} 
                        value={String(record.edge.record_node_id)}
                        className="whitespace-nowrap"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-xs">#{record.edge.record_node_id}</span>
                          <Badge variant="outline" className="text-xs">
                            {record.edge.score}
                          </Badge>
                        </div>
                      </TabsTrigger>
                    ))}
                  </TabsList>
                </ScrollArea>

                {selectedRecord && (
                  <TabsContent value={String(selectedRecord.edge.record_node_id)} className="mt-4">
                    <RecordDetail 
                      record={selectedRecord.edge}
                      problemId={selectedProblem.problemId}
                      problemName={selectedProblem.problemName}
                    />
                  </TabsContent>
                )}
              </Tabs>
            ) : (
              <div className="text-center text-muted-foreground py-8">
                暂无提交记录
              </div>
            )}
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
