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
  Users,
  Calendar,
  Clock,
  MoreHorizontal,
  Eye,
  Copy,
  Settings
} from "lucide-react"

// Mock data
const mockTrainings = [
  {
    id: "1",
    title: "C++ 入门训练",
    description: "适合初学者的 C++ 基础练习",
    user: "admin",
    trainingIden: "cpp-basic",
    type: "公开",
    problemCount: 12,
    participantCount: 156,
    status: "published",
    startTime: "2024-01-01",
    endTime: "2024-03-01",
    creationTime: "2023-12-15"
  },
  {
    id: "2",
    title: "算法进阶训练营",
    description: "提高算法能力的进阶训练",
    user: "smallfang",
    trainingIden: "algorithm-advanced",
    type: "私有",
    problemCount: 20,
    participantCount: 45,
    status: "published",
    startTime: "2024-02-01",
    endTime: "2024-04-01",
    creationTime: "2024-01-10"
  },
  {
    id: "3",
    title: "动态规划专题",
    description: "专注于动态规划算法的专项训练",
    user: "teacher",
    trainingIden: "dp-special",
    type: "公开",
    problemCount: 15,
    participantCount: 78,
    status: "draft",
    startTime: "2024-03-01",
    endTime: "2024-05-01",
    creationTime: "2024-01-20"
  }
]

const statusColors = {
  "published": "bg-green-100 text-green-800",
  "draft": "bg-gray-100 text-gray-800",
  "archived": "bg-red-100 text-red-800",
  "ongoing": "bg-blue-100 text-blue-800"
}

const statusLabels = {
  "published": "已发布",
  "draft": "草稿",
  "archived": "已归档",
  "ongoing": "进行中"
}

const typeColors = {
  "公开": "bg-blue-100 text-blue-800",
  "私有": "bg-purple-100 text-purple-800",
  "限时": "bg-orange-100 text-orange-800"
}

export default function TrainingManagementPage() {
  const [trainings, setTrainings] = useState(mockTrainings)
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState("all")
  const [typeFilter, setTypeFilter] = useState("all")
  const [filteredTrainings, setFilteredTrainings] = useState(mockTrainings)

  useEffect(() => {
    let filtered = trainings.filter(training =>
      training.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.trainingIden.toLowerCase().includes(searchTerm.toLowerCase()) ||
      training.user.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (statusFilter !== "all") {
      filtered = filtered.filter(training => training.status === statusFilter)
    }

    if (typeFilter !== "all") {
      filtered = filtered.filter(training => training.type === typeFilter)
    }

    setFilteredTrainings(filtered)
  }, [searchTerm, statusFilter, typeFilter, trainings])

  const isTrainingActive = (startTime: string, endTime: string) => {
    const now = new Date()
    const start = new Date(startTime)
    const end = new Date(endTime)
    return now >= start && now <= end
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-semibold">训练管理</h1>
          <p className="text-xs text-muted-foreground mb-2">管理系统中的所有训练和题单</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          创建训练
        </Button>
      </div>

      <Tabs defaultValue="list" className="space-y-4">
        <TabsList>
          <TabsTrigger value="list">训练列表</TabsTrigger>
          <TabsTrigger value="analytics">统计分析</TabsTrigger>
          <TabsTrigger value="templates">模板管理</TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BookOpen className="h-5 w-5" />
                训练列表
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mb-2">
                查看和管理系统中的所有训练
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-2 mb-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="搜索训练名称、描述、创建者或标识符..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-8"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有状态</SelectItem>
                    <SelectItem value="published">已发布</SelectItem>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="archived">已归档</SelectItem>
                    <SelectItem value="ongoing">进行中</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-[120px]">
                    <SelectValue placeholder="类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">所有类型</SelectItem>
                    <SelectItem value="公开">公开</SelectItem>
                    <SelectItem value="私有">私有</SelectItem>
                    <SelectItem value="限时">限时</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" size="sm">
                  <Filter className="mr-2 h-4 w-4" />
                  高级筛选
                </Button>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>训练信息</TableHead>
                      <TableHead>创建者</TableHead>
                      <TableHead>类型</TableHead>
                      <TableHead>题目数</TableHead>
                      <TableHead>参与人数</TableHead>
                      <TableHead>时间范围</TableHead>
                      <TableHead>状态</TableHead>
                      <TableHead>创建时间</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrainings.map((training) => (
                      <TableRow key={training.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{training.title}</div>
                            <div className="text-sm text-muted-foreground line-clamp-1">
                              {training.description}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              ID: {training.trainingIden}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 bg-gray-200 rounded-full"></div>
                            <span>{training.user}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={typeColors[training.type as keyof typeof typeColors]}>
                            {training.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{training.problemCount}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Users className="h-3 w-3" />
                            <span className="text-sm">{training.participantCount}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm space-y-1">
                            <div className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              <span>{training.startTime}</span>
                            </div>
                            <div className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              <span>{training.endTime}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className={statusColors[training.status as keyof typeof statusColors]}>
                            {statusLabels[training.status as keyof typeof statusLabels]}
                          </Badge>
                          {isTrainingActive(training.startTime, training.endTime) && (
                            <Badge className="bg-blue-100 text-blue-800 ml-1">
                              进行中
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">
                          {training.creationTime}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" className="h-8 w-8 p-0">
                                <span className="sr-only">打开菜单</span>
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>操作</DropdownMenuLabel>
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                查看
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                编辑
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Copy className="mr-2 h-4 w-4" />
                                复制
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Settings className="mr-2 h-4 w-4" />
                                设置
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem className="text-red-600">
                                <Trash2 className="mr-2 h-4 w-4" />
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
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总训练数</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">48</div>
                <p className="text-xs text-muted-foreground">
                  +6 较上月
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">活跃训练</CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">12</div>
                <p className="text-xs text-muted-foreground">
                  当前进行中
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">总参与人数</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">3.2K</div>
                <p className="text-xs text-muted-foreground">
                  +23% 较上月
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">平均完成率</CardTitle>
                <Settings className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">72.5%</div>
                <p className="text-xs text-muted-foreground">
                  +4.2% 较上月
                </p>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="templates" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                训练模板
              </CardTitle>
              <CardDescription className="text-xs text-muted-foreground mb-2">
                管理训练模板和预设配置
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <Card className="p-4 border-2 border-dashed border-gray-200 hover:border-gray-300 cursor-pointer">
                  <div className="text-center">
                    <Plus className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                    <h3 className="font-medium">创建模板</h3>
                    <p className="text-sm text-muted-foreground">创建新的训练模板</p>
                  </div>
                </Card>
                <Card className="p-4">
                  <h3 className="font-medium mb-2">算法基础训练</h3>
                  <p className="text-sm text-muted-foreground mb-3">包含基础算法题目的训练模板</p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">10 题</Badge>
                    <Button variant="ghost" size="sm">使用</Button>
                  </div>
                </Card>
                <Card className="p-4">
                  <h3 className="font-medium mb-2">动态规划专项</h3>
                  <p className="text-sm text-muted-foreground mb-3">动态规划算法专题训练模板</p>
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">15 题</Badge>
                    <Button variant="ghost" size="sm">使用</Button>
                  </div>
                </Card>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}