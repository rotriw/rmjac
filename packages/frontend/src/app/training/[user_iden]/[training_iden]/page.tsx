import { notFound } from "next/navigation"
import Link from "next/link"
import { Badge } from "@/components/ui/badge"
import { StandardCard } from "@/components/card/card"
import { getNormal as getTrainingView } from "@/api/server/api_training_view"
import { TrainingProblem, Training } from "@rmjac/api-declare"
import { TreeTable, TreeTableNode } from "@/components/table/treetable"
import TrainingContainer from "./training-container"
import React from "react"

interface PageProps {
  params: Promise<{
    user_iden: string
    training_iden: string
  }>
}

// Convert TrainingProblem to TreeTableNode, with status colors
function problemToTreeNode(
  problem: TrainingProblem,
  statusMap: Map<number, string>,
  index: number
): TreeTableNode | null {
  if ("ProblemIden" in problem) {
    const [edgeId, problemIden, problemNodeId] = problem.ProblemIden
    const edgeIdNum = typeof edgeId === "bigint" ? Number(edgeId) : edgeId
    const status = statusMap.get(Number(problemNodeId))
    const isAccepted = status === "Accepted"
    
    return {
      id: `problem-${edgeIdNum}`,
      content: (
        <div className="flex items-center justify-between flex-1">
          <div>
            <Link
              href={`/problem/${problemIden}`}
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              {problemIden}
            </Link>
          </div>
          <div className="flex gap-2 items-center">
            <Badge variant="outline">题目</Badge>
            {isAccepted && (
              <Badge className="bg-green-600 text-white">✓ 已通过</Badge>
            )}
          </div>
        </div>
      ),
      background: isAccepted ? "#dcfce7" : undefined, // light green
    } as TreeTableNode
  } else if ("ProblemTraining" in problem) {
    const trainingList = problem.ProblemTraining
    return {
      id: `training-${index}`,
      content: (
        <div className="font-medium">
          {trainingList.description}
        </div>
      ),
      children: trainingList.own_problem
        .map((p: TrainingProblem, idx: number) => problemToTreeNode(p, statusMap, idx))
        .filter((n): n is TreeTableNode => n !== null),
    } as TreeTableNode
  } else if ("ExistTraining" in problem) {
    const [, name] = problem.ExistTraining
    return {
      id: `exist-training-${index}`,
      content: (
        <div className="flex items-center justify-between flex-1">
          <span className="text-gray-600">引用训练: {name}</span>
          <Badge variant="secondary">引用</Badge>
        </div>
      ),
    } as TreeTableNode
  }
  return null
}

function countProblems(problemList: TrainingProblem[]): number {
  let count = 0
  for (const problem of problemList) {
    if ("ProblemIden" in problem) {
      count += 1
    } else if ("ProblemTraining" in problem) {
      count += countProblems(problem.ProblemTraining.own_problem)
    }
  }
  return count
}


export default async function TrainingPage({ params }: PageProps) {
  const { user_iden, training_iden } = await params

  try {
    const trainingDataResponse = await getTrainingView({ user_iden, training_iden })
    const trainingData: Training = trainingDataResponse.data
    const { training_node, problem_list } = trainingData
    const trainingNodeId = Number(training_node.node_id)
    // Get user status if logged in
    let statusMap = new Map<number, string>()
    try {
      const statusResp = trainingDataResponse.user;
      if (statusResp) {
        statusMap = new Map(Object.entries(statusResp.data).map(([k, v]) => [
          +k,
          String(v),
        ]))
        console.log(statusMap);
      }
    } catch (err) {
      // User not logged in or status fetch failed, just continue without status
      console.warn("Could not fetch training status:", err)
    }

    // Convert problems to TreeTableNodes
    const treeData = problem_list.own_problem
      .map((p, idx) => problemToTreeNode(p, statusMap, idx))
      .filter((n): n is TreeTableNode => n !== null)

    // 检查是否有编辑权限（根据 API 是否返回 user 数据来判断）
    const hasEditPermission = trainingDataResponse.user !== null
    const isPinned = Boolean((trainingDataResponse as any).pin ?? (trainingDataResponse as any).is_pin ?? (trainingDataResponse as any).pinned ?? false)

    // 统计已完成数量
    const completedCount = Array.from(statusMap.values()).filter(
      (status) => status === "Accepted"
    ).length

    const totalCount = countProblems(problem_list.own_problem)

    return (
      <TrainingContainer
        userIden={user_iden}
        trainingIden={training_iden}
        trainingName={training_node.public.name}
        trainingType={training_node.public.training_type}
        startTime={training_node.public.start_time}
        endTime={training_node.public.end_time}
        trainingNodeId={trainingNodeId}
        initialPinned={isPinned}
        hasEditPermission={hasEditPermission}
        completedCount={completedCount}
        totalCount={totalCount}
        problems={problem_list.own_problem}
        statusMap={statusMap}
      >
        <StandardCard title="简介">
          <div className="prose max-w-none mb-6">
            <p>{training_node.public.description}</p>
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
      </TrainingContainer>
    )
  } catch (error) {
    console.error("Failed to fetch training:", error)
    notFound()
  }
}