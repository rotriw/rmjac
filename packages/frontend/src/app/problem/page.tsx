"use client"

import { useState, useEffect, useCallback } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { StandardCard } from "@/components/card/card"
import { postSearch } from "@/api/server/api_problem_search"
import { ProblemListItem, ProblemListQuery } from "@rmjac/api-declare"
import { Loader2 } from "lucide-react"

const difficultyColors: Record<string, string> = {
  "入门": "bg-green-500",
  "简单": "bg-blue-500",
  "中等": "bg-yellow-500",
  "困难": "bg-orange-500",
  "极限": "bg-red-500",
};

export default function ProblemsPage() {
  const [problems, setProblems] = useState<ProblemListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState<string>("all")
  const [currentPage, setCurrentPage] = useState(1)
  
  // Since API doesn't return total count, we optimistically allow next page if we got full page
  const [hasMore, setHasMore] = useState(false)

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

  const fetchProblems = useCallback(async () => {
    setLoading(true)
    try {
      // Cast payload to any to bypass BigInt type definition while passing numbers for JSON compatibility
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: any = {
        page: currentPage,
        per_page: problemsPerPage,
        name: searchTerm || null,
        tag: difficultyFilter !== "all" ? [difficultyFilter] : null
      }
      
      const response = await postSearch({ query: query as ProblemListQuery })
      setProblems(response.problems)
      setHasMore(response.problems.length === problemsPerPage)
    } catch (error) {
      console.error("Failed to fetch problems:", error)
      setProblems([])
    } finally {
      setLoading(false)
    }
  }, [currentPage, searchTerm, difficultyFilter])

  // Debounce search effect
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProblems()
    }, 500)
    return () => clearTimeout(timer)
  }, [fetchProblems])

  const handleReset = () => {
    setSearchTerm("")
    setDifficultyFilter("all")
    setCurrentPage(1)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(e.target.value)
    setCurrentPage(1) // Reset to page 1 on search
  }

  const handleDifficultyChange = (value: string) => {
    setDifficultyFilter(value)
    setCurrentPage(1) // Reset to page 1 on filter
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <StandardCard title="题目列表" className="mb-6">
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="flex-1">
            <Input
              placeholder="搜索题目名称、ID..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full"
            />
          </div>
          <Select value={difficultyFilter} onValueChange={handleDifficultyChange}>
            <SelectTrigger className="sm:w-32">
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
          <Button onClick={handleReset} variant="outline">
            重置
          </Button>
        </div>

        <div className="rounded-md border relative min-h-[200px]">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-24">ID</TableHead>
                <TableHead>题目名称</TableHead>
                <TableHead className="w-20">难度</TableHead>
                <TableHead className="w-20">时间限制</TableHead>
                <TableHead className="w-20">内存限制</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                 <TableRow>
                    <TableCell colSpan={5} className="h-32 text-center">
                        <div className="flex justify-center items-center">
                            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                    </TableCell>
                 </TableRow>
              ) : problems.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8">
                    没有找到匹配的题目
                  </TableCell>
                </TableRow>
              ) : (
                problems.map((problem) => {
                  const tags = getProblemTags(problem)
                  const name = getProblemName(problem)
                  return (
                  <TableRow key={problem.iden} className="hover:bg-gray-50/50">
                    <TableCell className="font-mono text-sm">
                      {problem.iden}
                    </TableCell>
                    <TableCell>
                      <Link 
                        href={`/problem/${problem.iden}`}
                        className="text-primary hover:underline font-medium"
                      >
                        {name}
                      </Link>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {tags.slice(0, 3).map((tag: string) => (
                          <Badge
                            key={tag}
                            variant="secondary"
                            className="text-xs font-normal"
                          >
                            {tag}
                          </Badge>
                        ))}
                        {tags.length > 3 && (
                          <Badge variant="secondary" className="text-xs font-normal">
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
                              className={`${difficultyColors[tag as keyof typeof difficultyColors]} text-white border-0`}
                            >
                              {tag}
                            </Badge>
                          )
                        }
                        return null
                      })}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getTimeLimit(problem)} ms
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {getMemoryLimit(problem)} MB
                    </TableCell>
                  </TableRow>
                )})
              )}
            </TableBody>
          </Table>
        </div>

        <div className="flex items-center justify-between mt-6">
            <div className="text-sm text-muted-foreground">
              第 {currentPage} 页
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1 || loading}
                variant="outline"
                size="sm"
              >
                上一页
              </Button>
              <Button
                onClick={() => setCurrentPage(currentPage + 1)}
                disabled={!hasMore || loading}
                variant="outline"
                size="sm"
              >
                下一页
              </Button>
            </div>
          </div>
      </StandardCard>
    </div>
  )
}