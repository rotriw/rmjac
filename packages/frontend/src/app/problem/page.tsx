"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StandardCard } from "@/components/card/card"
import { getAllProblems, difficultyColors} from "@/api/server/problem"
import { ProblemListItem } from "@rmjac/api-declare"

export default function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemListItem[]>([])
  const [filteredProblems, setFilteredProblems] = useState<ProblemListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const problemsPerPage = 20

  // Helper functions to extract data from ProblemListItem
  const getProblemName = (item: ProblemListItem) => item.model.problem_node.public.name
  const getProblemTags = (item: ProblemListItem) => item.model.tag.map(t => t.public.tag_name)
  const getTimeLimit = (item: ProblemListItem) => {
    const statements = item.model.problem_statement_node
    if (statements.length > 0 && statements[0][1]) {
      return statements[0][1].public.time_limit
    }
    return 1000
  }
  const getMemoryLimit = (item: ProblemListItem) => {
    const statements = item.model.problem_statement_node
    if (statements.length > 0 && statements[0][1]) {
      return statements[0][1].public.memory_limit
    }
    return 256
  }

  useEffect(() => {
    fetchProblems()
  }, [])

  useEffect(() => {
    filterProblems()
  }, [problems, searchTerm, difficultyFilter])

  useEffect(() => {
    setTotalPages(Math.ceil(filteredProblems.length / problemsPerPage))
  }, [filteredProblems])

  const fetchProblems = async () => {
    try {
      const response = await getAllProblems()
      setProblems(response.problems)
    } catch (error) {
      console.error("Failed to fetch problems:", error)
    } finally {
      setLoading(false)
    }
  }

  const filterProblems = () => {
    let filtered = problems

    if (searchTerm) {
      filtered = filtered.filter(
        problem => {
          const name = getProblemName(problem)
          const tags = getProblemTags(problem)
          return name.toLowerCase().includes(searchTerm.toLowerCase()) ||
            problem.iden.toLowerCase().includes(searchTerm.toLowerCase()) ||
            tags.some((tag: string) => tag.toLowerCase().includes(searchTerm.toLowerCase()))
        }
      )
    }

    if (difficultyFilter !== "all") {
      filtered = filtered.filter(problem => getProblemTags(problem).includes(difficultyFilter))
    }

    setFilteredProblems(filtered)
    setCurrentPage(1)
  }

  const paginatedProblems = filteredProblems.slice(
    (currentPage - 1) * problemsPerPage,
    currentPage * problemsPerPage
  )

  const handleReset = () => {
    setSearchTerm("")
    setDifficultyFilter("all")
  }

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex justify-center items-center min-h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <StandardCard title="题目列表" className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="搜索题目名称、ID或标签..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter} className="w-full sm:w-32">
            <option value="all">全部难度</option>
            <option value="入门">入门</option>
            <option value="简单">简单</option>
            <option value="中等">中等</option>
            <option value="困难">困难</option>
            <option value="极限">极限</option>
          </Select>
          <Button onClick={handleReset} variant="outline">
            重置
          </Button>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-16">ID</TableHead>
                <TableHead>题目名称</TableHead>
                <TableHead className="w-20">难度</TableHead>
                <TableHead className="w-20">时间限制</TableHead>
                <TableHead className="w-20">内存限制</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProblems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    没有找到匹配的题目
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProblems.map((problem) => {
                  const tags = getProblemTags(problem)
                  const name = getProblemName(problem)
                  return (
                  <TableRow key={problem.iden} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">
                      {problem.iden}
                    </TableCell>
                    <TableCell>
                      <Link 
                        href={`/problem/${problem.iden}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {name}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.slice(0, 3).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {tags.map((tag: string) => {
                        if (["入门", "简单", "中等", "困难", "极限"].includes(tag)) {
                          return (
                            <Badge
                              key={tag}
                              className={difficultyColors[tag as keyof typeof difficultyColors]}
                            >
                              {tag}
                            </Badge>
                          )
                        }
                        return null
                      })}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getTimeLimit(problem)} ms
                    </TableCell>
                    <TableCell className="text-sm">
                      {getMemoryLimit(problem)} MB
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </div>

        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-gray-600">
              显示 {(currentPage - 1) * problemsPerPage + 1} -{" "}
              {Math.min(currentPage * problemsPerPage, filteredProblems.length)} 
              {" "} 共 {filteredProblems.length} 道题目
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                variant="outline"
                size="sm"
              >
                上一页
              </Button>
              <div className="flex items-center gap-2">
                <span className="text-sm">第</span>
                <Input
                  type="number"
                  min="1"
                  max={totalPages}
                  value={currentPage}
                  onChange={(e) => {
                    const page = parseInt(e.target.value) || 1
                    if (page >= 1 && page <= totalPages) {
                      setCurrentPage(page)
                    }
                  }}
                  className="w-16 text-center"
                />
                <span className="text-sm">/ {totalPages} 页</span>
              </div>
              <Button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                variant="outline"
                size="sm"
              >
                下一页
              </Button>
            </div>
          </div>
        )}
      </StandardCard>
    </div>
  )
}