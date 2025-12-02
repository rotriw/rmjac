import { notFound } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { StandardCard, TitleCard } from "@/components/card/card"
import { getTrainingByIden, TrainingProblem } from "@/lib/api"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import React from "react"

interface PageProps {
  params: Promise<{
    user_iden: string
    training_iden: string
  }>
}

function renderProblemList(problems: TrainingProblem[], depth = 0): React.ReactNode {
  return problems.map((problem, index) => {
    if (problem.ProblemIden) {
      return (
        <TableRow key={`problem-${index}`} className="hover:bg-gray-50">
          <TableCell className="font-mono text-sm pl-4">
            {problem.ProblemIden}
          </TableCell>
          <TableCell>
            <Link
              href={`/problem/${problem.ProblemIden}`}
              className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
            >
              题目 {problem.ProblemIden}
            </Link>
          </TableCell>
          <TableCell>
            <Badge variant="outline">题目</Badge>
          </TableCell>
        </TableRow>
      )
    } else if (problem.ProblemTraining) {
      return (
        <React.Fragment key={`training-${index}`}>
          <TableRow className="bg-gray-50">
            <TableCell colSpan={3} className="font-medium py-3 pl-4">
              {problem.ProblemTraining.description}
            </TableCell>
          </TableRow>
          {renderProblemList(problem.ProblemTraining.own_problem, depth + 1)}
        </React.Fragment>
      )
    } else if (problem.ExistTraining) {
      const [, name] = problem.ExistTraining
      return (
        <TableRow key={`exist-training-${index}`} className="hover:bg-gray-50">
          <TableCell className="font-mono text-sm pl-4">
            {name}
          </TableCell>
          <TableCell>
            <span className="text-gray-600">引用训练: {name}</span>
          </TableCell>
          <TableCell>
            <Badge variant="secondary">引用</Badge>
          </TableCell>
        </TableRow>
      )
    }
    return null
  })
}

export default async function TrainingPage({ params }: PageProps) {
  const { user_iden, training_iden } = await params

  try {
    const trainingData = await getTrainingByIden(user_iden, training_iden)
    const { training_node, problem_list } = trainingData

    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <TitleCard 
          title={training_node.public.name} 
          description={`ID: ${training_node.public.iden}`}
        >
          <div className="flex gap-2 mt-4">
            <Badge variant="outline">
              {training_node.public.training_type}
            </Badge>
            <Badge variant="outline">
              {new Date(training_node.public.start_time).toLocaleDateString()} - {new Date(training_node.public.end_time).toLocaleDateString()}
            </Badge>
          </div>
        </TitleCard>
        
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mt-6">
          <div className="lg:col-span-3">
            <StandardCard title="训练详情">
              <div className="prose max-w-none mb-6">
                <p>{training_node.public.description}</p>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-32">ID</TableHead>
                      <TableHead>名称</TableHead>
                      <TableHead className="w-24">类型</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {problem_list.own_problem.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={3} className="text-center py-8 text-gray-500">
                          暂无题目
                        </TableCell>
                      </TableRow>
                    ) : (
                      renderProblemList(problem_list.own_problem)
                    )}
                  </TableBody>
                </Table>
              </div>
            </StandardCard>
          </div>

          <div className="lg:col-span-1">
            <div className="space-y-4">
              <StandardCard title="操作">
                <Link href="/training">
                  <Button variant="outline" className="w-full">
                    返回训练列表
                  </Button>
                </Link>
              </StandardCard>
            </div>
          </div>
        </div>
      </div>
    )
  } catch (error) {
    console.error("Failed to fetch training:", error)
    notFound()
  }
}