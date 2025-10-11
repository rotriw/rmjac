"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  BookOpen,
  Tag,
  Clock,
  MemoryStick,
  Eye,
  Copy,
  MoreHorizontal,
  RefreshCw
} from "lucide-react"
import { getAllProblems, type Problem, getAcceptanceRate, difficultyColors, statusColors, statusLabels } from "@/lib/api"

export default function ProblemManagementPage() {
  const [problems, setProblems] = useState<Problem[]>([])
  const [filteredProblems, setFilteredProblems] = useState<Problem[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [difficultyFilter, setDifficultyFilter] = useState("all")
  const [statusFilter, setStatusFilter] = useState("all")
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Fetch problems from API
  const fetchProblems = async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getAllProblems()
      setProblems(data.problems)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch problems')
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch
  useEffect(() => {
    fetchProblems()
  }, [])

  // Filter problems based on search and filters
  useEffect(() => {
    let filtered = problems.filter(problem =>
      problem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      problem.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    )

    if (difficultyFilter !== "all") {
      filtered = filtered.filter(problem => problem.difficulty === difficultyFilter)
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter(problem => problem.status === statusFilter)
    }

    setFilteredProblems(filtered)
  }, [searchTerm, difficultyFilter, statusFilter, problems])

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center justify-between mb-2">
        <div>
          <CardTitle>题目管理</CardTitle>
          <CardDescription className="text-xs text-muted-foreground">
            管理系统中的所有题目
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={fetchProblems} disabled={loading}>
            <RefreshCw className={`mr-2 h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
            刷新
          </Button>
          <Button size="sm">
            <Plus className="mr-2 h-3 w-3" />
            创建题目
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="mb-4 p-3 border border-red-200 bg-red-50 rounded-md">
          <p className="text-sm text-red-600">加载失败: {error}</p>
        </div>
      )}

      {/* Loading state */}
      {loading && (
        <div className="mb-4 p-3 border border-blue-200 bg-blue-50 rounded-md">
          <p className="text-sm text-blue-600">正在加载题目...</p>
        </div>
      )}

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">题目列表</TabsTrigger>
          <TabsTrigger value="analytics">统计分析</TabsTrigger>
          <TabsTrigger value="tags">标签管理</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card className="shadow-none rounded-sm p-0">
            <CardContent className="p-3">
              <CardTitle className="text-sm mb-2 flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                题目列表
              </CardTitle>
              <CardDescription className="text-xs mb-3">
                查看和管理系统中的所有题目
              </CardDescription>
              <div className="flex items-center space-x-2 mb-3">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2 h-3 w-3 text-muted-foreground" />
                  <Input
                    placeholder="搜索题目ID、名称或标签..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-7 h-8 text-xs"
                  />
                </div>
                <Select value={difficultyFilter} onValueChange={setDifficultyFilter}>
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue placeholder="难度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有难度</SelectItem>
                    <SelectItem value="入门">入门</SelectItem>
                    <SelectItem value="简单">简单</SelectItem>
                    <SelectItem value="中等">中等</SelectItem>
                    <SelectItem value="困难">困难</SelectItem>
                    <SelectItem value="极限">极限</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[100px] h-8 text-xs">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="published">已发布</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="archived">已归档</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm" className="h-8 text-xs">
                  <Filter className="mr-1 h-3 w-3" />
                  高级筛选
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="text-xs">题目</TableHead>
                      <TableHead className="text-xs">难度</TableHead>
                      <TableHead className="text-xs">标签</TableHead>
                      <TableHead className="text-xs">限制</TableHead>
                      <TableHead className="text-xs">统计</TableHead>
                      <TableHead className="text-xs">状态</TableHead>
                      <TableHead className="text-xs">创建时间</TableHead>
                      <TableHead className="text-xs text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProblems.map((problem) => (
                      <TableRow key={problem.id}>
                        <TableCell>
                          <div>
                            <div className="text-xs font-medium">{problem.id} {problem.name}</div>
                            <div className="text-xs text-muted-foreground line-clamp-1">
                              {problem.description}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${difficultyColors[problem.difficulty as keyof typeof difficultyColors]} text-xs`}>
                            {problem.difficulty}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {problem.tags.map((tag) => (
                              <Badge key={tag} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {problem.timeLimit}
                            </div>
                            <div className="flex items-center gap-1">
                              <MemoryStick className="h-3 w-3" />
                              {problem.memoryLimit}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs space-y-1">
                            <div>提交: {problem.submissionCount}</div>
                            <div>通过: {problem.acceptedCount}</div>
                            <div className="font-medium text-green-600">
                              {getAcceptanceRate(problem.acceptedCount, problem.submissionCount)}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={`${statusColors[problem.status as keyof typeof statusColors]} text-xs`}>
                            {statusLabels[problem.status as keyof typeof statusLabels]}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {problem.creationTime}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-6 w-6 p-0">
                                <span className="sr-only">打开菜单</span>
                                <MoreHorizontal className="h-3 w-3" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel className="text-xs">操作</DropdownMenuLabel>
                              <DropdownMenuItem className="text-xs">
                                <Eye className="mr-2 h-3 w-3" />
                                查看
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs">
                                <Edit className="mr-2 h-3 w-3" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-xs">
                                <Copy className="mr-2 h-3 w-3" />
                                复制
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-xs text-red-600">
                                <Trash2 className="mr-2 h-3 w-3" />
                                删除
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <Card className="shadow-none rounded-sm p-0">
              <CardContent className="p-3">
                <CardTitle className="text-sm mb-2 flex items-center gap-2">
                  <BookOpen className="h-4 w-4" />
                  总题目数
                </CardTitle>
                <div className="text-lg font-bold">156</div>
                <p className="text-xs text-muted-foreground">
                  +12 较上月
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none rounded-sm p-0">
              <CardContent className="p-3">
                <CardTitle className="text-sm mb-2 flex items-center gap-2">
                  <Eye className="h-4 w-4" />
                  已发布题目
                </CardTitle>
                <div className="text-lg font-bold">142</div>
                <p className="text-xs text-muted-foreground">
                  91% 发布率
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none rounded-sm p-0">
              <CardContent className="p-3">
                <CardTitle className="text-sm mb-2 flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  总提交数
                </CardTitle>
                <div className="text-lg font-bold">12.5K</div>
                <p className="text-xs text-muted-foreground">
                  +18% 较上月
                </p>
              </CardContent>
            </Card>
            <Card className="shadow-none rounded-sm p-0">
              <CardContent className="p-3">
                <CardTitle className="text-sm mb-2 flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  平均通过率
                </CardTitle>
                <div className="text-lg font-bold">68.5%</div>
                <p className="text-xs text-muted-foreground">
                  +2.1% 较上月
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="tags" className="space-y-4">
          <Card className="shadow-none rounded-sm p-0">
            <CardContent className="p-3">
              <CardTitle className="text-sm mb-2 flex items-center gap-2">
                <Tag className="h-4 w-4" />
                标签管理
              </CardTitle>
              <CardDescription className="text-xs mb-3">
                管理题目标签和分类
              </CardDescription>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-blue-100 text-blue-800 text-xs">动态规划</Badge>
                <Badge className="bg-green-100 text-green-800 text-xs">数学</Badge>
                <Badge className="bg-purple-100 text-purple-800 text-xs">图论</Badge>
                <Badge className="bg-yellow-100 text-yellow-800 text-xs">搜索</Badge>
                <Badge className="bg-red-100 text-red-800 text-xs">递归</Badge>
                <Badge className="bg-indigo-100 text-indigo-800 text-xs">贪心</Badge>
                <Badge className="bg-gray-100 text-gray-800 text-xs">模拟</Badge>
                <Badge className="bg-pink-100 text-pink-800 text-xs">字符串</Badge>
                <Button variant="outline" size="sm" className="h-6 text-xs">
                  <Plus className="mr-1 h-3 w-3" />
                  添加标签
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}