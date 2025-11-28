"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StandardCard } from "@/components/card/card"
import { getAllProblems, getAcceptanceRate, difficultyColors, statusColors, statusLabels, type Problem } from "@/lib/api"

export default function ProblemsPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)

  const problemsPerPage = 20

  useEffect(() => {
    fetchProblems()
  }, [])

  useEffect(() => {
    filterProblems()
  }, [problems, searchTerm, difficultyFilter, statusFilter])

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
        problem =>
          problem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          problem.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
          problem.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (difficultyFilter !== "all") {
      filtered = filtered.filter(problem => problem.tags.includes(difficultyFilter))
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(problem => problem.status === statusFilter)
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
    setStatusFilter("all")
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
          <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="难度" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部难度</SelectItem>
              <SelectItem value="入门">入门</SelectItem>
              <SelectItem value="简单">简单</SelectItem>
              <SelectItem value="中等">中等</SelectItem>
              <SelectItem value="困难">困难</SelectItem>
              <SelectItem value="极限">极限</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-32">
              <SelectValue placeholder="状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="published">已发布</SelectItem>
              <SelectItem value="draft">草稿</SelectItem>
              <SelectItem value="archived">已归档</SelectItem>
            </SelectContent>
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
                <TableHead className="w-24">通过率</TableHead>
                <TableHead className="w-16">状态</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paginatedProblems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8">
                    没有找到匹配的题目
                  </TableCell>
                </TableRow>
              ) : (
                paginatedProblems.map((problem) => (
                  <TableRow key={problem.id} className="hover:bg-gray-50">
                    <TableCell className="font-mono text-sm">
                      {problem.id}
                    </TableCell>
                    <TableCell>
                      <Link 
                        href={`/problem/${problem.id}`}
                        className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                      >
                        {problem.name}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {problem.tags.slice(0, 3).map((tag) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {problem.tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs">
                            +{problem.tags.length - 3}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {problem.tags.map(tag => {
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
                      {problem.timeLimit}
                    </TableCell>
                    <TableCell className="text-sm">
                      {problem.memoryLimit}
                    </TableCell>
                    <TableCell className="text-sm">
                      {getAcceptanceRate(problem.acceptedCount, problem.submissionCount)}
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={statusColors[problem.status]}
                      >
                        {statusLabels[problem.status]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
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