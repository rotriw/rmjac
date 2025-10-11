"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Calendar,
  Users,
  BookOpen,
  Target,
  Star,
  Clock,
  Plus,
  Play,
  CheckCircle,
  XCircle,
  Trophy,
  TrendingUp,
  User,
  Edit,
  Settings
} from "lucide-react"
import Link from "next/link"

// Mock training data
const mockTrainingData = {
  id: "tanxin1",
  name: "贪心算法基础训练",
  description: "本训练计划旨在帮助学习者掌握贪心算法的基本思想和经典应用。通过系统性的题目练习，你将学会如何识别贪心算法适用的场景，以及如何设计贪心策略来解决问题。",
  author: "User1",
  authorId: "user123",
  difficulty: "简单",
  type: "公开",
  tags: ["贪心", "算法基础", "区间调度", "背包问题"],
  problems: 8,
  participants: 156,
  rating: 4.8,
  creationTime: "2024-01-15",
  endTime: "2024-12-31",
  chapters: [
    {
      id: 1,
      title: "第一章：贪心思想入门",
      description: "学习贪心算法的基本概念和思想，理解贪心选择性质和最优子结构。",
      problems: [
        { id: "P1001", name: "A+B Problem", difficulty: "入门", status: "AC", attempts: 3 },
        { id: "P1002", name: "活动安排问题", difficulty: "简单", status: "AC", attempts: 2 },
        { id: "P1003", name: "区间覆盖问题", difficulty: "简单", status: "WA", attempts: 5 }
      ]
    },
    {
      id: 2,
      title: "第二章：经典贪心应用",
      description: "学习贪心算法在各种经典问题中的应用，包括背包问题、调度问题等。",
      problems: [
        { id: "P1004", name: "分数背包问题", difficulty: "中等", status: "TODO", attempts: 0 },
        { id: "P1005", name: "哈夫曼编码", difficulty: "中等", status: "TODO", attempts: 0 },
        { id: "P1006", name: "最小生成树", difficulty: "中等", status: "TODO", attempts: 0 }
      ]
    }
  ],
  statistics: {
    completedProblems: 3,
    totalProblems: 8,
    completionRate: 37.5,
    averageAttempts: 3.3,
    difficulty: "简单"
  }
}

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "入门": return "bg-green-100 text-green-800"
    case "简单": return "bg-blue-100 text-blue-800"
    case "中等": return "bg-yellow-100 text-yellow-800"
    case "困难": return "bg-red-100 text-red-800"
    case "极限": return "bg-purple-100 text-purple-800"
    default: return "bg-gray-100 text-gray-800"
  }
}

const getStatusIcon = (status: string) => {
  switch (status) {
    case "AC": return <CheckCircle className="h-4 w-4 text-green-600" />
    case "WA": return <XCircle className="h-4 w-4 text-red-600" />
    case "TODO": return <Target className="h-4 w-4 text-gray-400" />
    default: return <Target className="h-4 w-4 text-gray-400" />
  }
}

export default function TrainingDetailPage() {
  const params = useParams()
  const trainingId = params.id as string

  const [training, setTraining] = useState(mockTrainingData)
  const [activeTab, setActiveTab] = useState("problems")
  const [loading, setLoading] = useState(false)

  // TODO: Replace with actual API call
  // useEffect(() => {
  //   const fetchTraining = async () => {
  //     try {
  //       setLoading(true)
  //       const trainingData = await getTrainingById(trainingId)
  //       setTraining(trainingData)
  //     } catch (error) {
  //       console.error('Failed to fetch training:', error)
  //     } finally {
  //       setLoading(false)
  //     }
  //   }
  //   fetchTraining()
  // }, [trainingId])

  const renderProblemRow = (problem: any, chapterIndex: number, problemIndex: number) => (
    <div
      key={`${chapterIndex}-${problemIndex}`}
      className="grid grid-cols-12 gap-2 items-center p-2 hover:bg-gray-50 transition-colors border-b border-gray-100 last:border-b-0"
    >
      <div className="col-span-1 flex justify-center">
        {getStatusIcon(problem.status)}
      </div>
      <div className="col-span-6">
        <Link href={`/problem/${problem.id}`} className="text-sm font-medium hover:text-blue-600 transition-colors">
          {problem.id} {problem.name}
        </Link>
      </div>
      <div className="col-span-2">
        <Badge variant="outline" className={`text-xs ${getDifficultyColor(problem.difficulty)}`}>
          {problem.difficulty}
        </Badge>
      </div>
      <div className="col-span-2 text-xs text-muted-foreground text-center">
        {problem.attempts > 0 ? `${problem.attempts}次尝试` : '-'}
      </div>
      <div className="col-span-1 flex justify-center">
        <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" asChild>
          <Link href={`/problem/${problem.id}`}>
            <Play className="h-3 w-3" />
          </Link>
        </Button>
      </div>
    </div>
  )

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div>加载中...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">

          {/* Header */}
          <div className="mb-6">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-semibold">{training.name}</h1>
                  <Badge className={getDifficultyColor(training.difficulty)}>
                    {training.difficulty}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                    <span className="text-sm">{training.rating}</span>
                  </div>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <User className="h-4 w-4" />
                    <span>by {training.author}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{training.participants} 参与者</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>创建于 {training.creationTime}</span>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <Button size="sm" className="flex items-center gap-2">
                  <Play className="h-4 w-4" />
                  开始训练
                </Button>
                <Button variant="outline" size="sm" className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  加入TODO
                </Button>
              </div>
            </div>

            {/* Tags */}
            <div className="flex flex-wrap gap-2">
              {training.tags.map(tag => (
                <Badge key={tag} variant="secondary">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Left Column - Main Content */}
            <div className="lg:col-span-2 space-y-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-4">
                  <TabsTrigger value="problems" className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4" />
                    题目
                  </TabsTrigger>
                  <TabsTrigger value="overview" className="flex items-center gap-2">
                    <Target className="h-4 w-4" />
                    概览
                  </TabsTrigger>
                  <TabsTrigger value="ranking" className="flex items-center gap-2">
                    <Trophy className="h-4 w-4" />
                    排名
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="flex items-center gap-2">
                    <Settings className="h-4 w-4" />
                    设置
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="problems" className="space-y-4">
                  {training.chapters.map((chapter, chapterIndex) => (
                    <div key={chapter.id} className="bg-green-50 rounded-sm border border-green-100 overflow-hidden">
                      {/* Chapter Header */}
                      <div className="bg-green-100 px-4 py-3 border-b border-green-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <CardTitle className="text-sm flex items-center gap-2 text-green-800">
                              <BookOpen className="h-4 w-4" />
                              {chapter.title}
                            </CardTitle>
                            <div className="text-xs text-green-700 mt-1">
                              {chapter.description}
                            </div>
                          </div>
                          <Badge variant="outline" className="text-xs bg-green-50 text-green-800 border-green-300">
                            {chapter.problems.length}道题
                          </Badge>
                        </div>
                      </div>

                      {/* Problems Table */}
                      <div className="bg-white">
                        {/* Table Header */}
                        <div className="grid grid-cols-12 gap-2 items-center p-2 bg-gray-50 border-b border-gray-200 text-xs font-medium text-gray-700">
                          <div className="col-span-1 text-center">状态</div>
                          <div className="col-span-6">题目</div>
                          <div className="col-span-2 text-center">难度</div>
                          <div className="col-span-2 text-center">尝试次数</div>
                          <div className="col-span-1 text-center">操作</div>
                        </div>

                        {/* Problem Rows */}
                        {chapter.problems.map((problem, problemIndex) =>
                          renderProblemRow(problem, chapterIndex, problemIndex)
                        )}
                      </div>
                    </div>
                  ))}
                </TabsContent>

                <TabsContent value="overview" className="space-y-4">
                  <Card className="shadow-none rounded-sm p-0">
                    <CardContent className="p-3">
                      <CardTitle className="text-sm flex items-center gap-2 mb-2">
                        <Target className="h-4 w-4" />
                        训练概览
                      </CardTitle>
                      <p className="text-xs text-muted-foreground mb-3">
                        {training.description}
                      </p>

                      <div className="grid gap-3 md:grid-cols-2">
                        <Card className="shadow-none rounded-sm p-0">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <TrendingUp className="h-4 w-4 text-blue-600" />
                              <CardTitle className="text-sm">进度统计</CardTitle>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span>完成进度</span>
                                <span className="font-medium">{training.statistics.completionRate}%</span>
                              </div>
                              <div className="w-full bg-gray-200 rounded-full h-2">
                                <div
                                  className="bg-blue-600 h-2 rounded-full"
                                  style={{ width: `${training.statistics.completionRate}%` }}
                                ></div>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>已完成题目</span>
                                <span>{training.statistics.completedProblems}/{training.statistics.totalProblems}</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        <Card className="shadow-none rounded-sm p-0">
                          <CardContent className="p-3">
                            <div className="flex items-center gap-2 mb-2">
                              <Trophy className="h-4 w-4 text-yellow-600" />
                              <CardTitle className="text-sm">学习统计</CardTitle>
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between text-xs">
                                <span>平均尝试次数</span>
                                <span className="font-medium">{training.statistics.averageAttempts}</span>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>训练难度</span>
                                <Badge className={`text-xs ${getDifficultyColor(training.statistics.difficulty)}`}>
                                  {training.statistics.difficulty}
                                </Badge>
                              </div>
                              <div className="flex justify-between text-xs">
                                <span>预计完成时间</span>
                                <span className="font-medium">2-3小时</span>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="ranking" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Trophy className="h-5 w-5" />
                        排名榜
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-center py-12">
                        <Trophy className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                        <h3 className="text-lg font-medium mb-2">排名功能开发中</h3>
                        <p className="text-muted-foreground">
                          敬请期待训练排名功能
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>

                <TabsContent value="settings" className="space-y-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Settings className="h-5 w-5" />
                        训练设置
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">通知设置</h3>
                            <p className="text-sm text-muted-foreground">接收训练相关通知</p>
                          </div>
                          <Button variant="outline" size="sm">
                            配置
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">学习计划</h3>
                            <p className="text-sm text-muted-foreground">设置每日学习目标</p>
                          </div>
                          <Button variant="outline" size="sm">
                            设置
                          </Button>
                        </div>
                        <div className="flex justify-between items-center">
                          <div>
                            <h3 className="font-medium">数据导出</h3>
                            <p className="text-sm text-muted-foreground">导出学习数据</p>
                          </div>
                          <Button variant="outline" size="sm">
                            导出
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </TabsContent>
              </Tabs>
            </div>

            {/* Right Column - Sidebar */}
            <div className="space-y-4">
              <Card className="shadow-none rounded-sm p-0">
                <CardContent className="p-3">
                  <CardTitle className="text-sm mb-3">训练进度</CardTitle>
                  <div className="space-y-3">
                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>总进度</span>
                        <span className="font-medium">{training.statistics.completionRate}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${training.statistics.completionRate}%` }}
                        ></div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex justify-between text-xs">
                        <span>已完成题目</span>
                        <span className="font-medium">{training.statistics.completedProblems}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>待完成题目</span>
                        <span className="font-medium">{training.statistics.totalProblems - training.statistics.completedProblems}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span>平均尝试次数</span>
                        <span className="font-medium">{training.statistics.averageAttempts}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none rounded-sm p-0">
                <CardContent className="p-3">
                  <CardTitle className="text-sm mb-3">快速操作</CardTitle>
                  <div className="space-y-2">
                    <Button variant="outline" className="w-full justify-start h-7 text-xs" size="sm">
                      <Play className="h-3 w-3 mr-2" />
                      继续学习
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-7 text-xs" size="sm">
                      <TrendingUp className="h-3 w-3 mr-2" />
                      查看统计
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-7 text-xs" size="sm">
                      <Users className="h-3 w-3 mr-2" />
                      邀请好友
                    </Button>
                    <Button variant="outline" className="w-full justify-start h-7 text-xs" size="sm">
                      <Edit className="h-3 w-3 mr-2" />
                      编辑训练
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-none rounded-sm p-0">
                <CardContent className="p-3">
                  <CardTitle className="text-sm mb-3">相关信息</CardTitle>
                  <div className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">创建者</span>
                      <span className="text-xs font-medium">{training.author}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">难度</span>
                      <Badge className={`text-xs ${getDifficultyColor(training.difficulty)}`}>
                        {training.difficulty}
                      </Badge>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">题目数量</span>
                      <span className="text-xs font-medium">{training.problems}道</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">参与人数</span>
                      <span className="text-xs font-medium">{training.participants}人</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-muted-foreground">评分</span>
                      <div className="flex items-center gap-1">
                        <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                        <span className="text-xs font-medium">{training.rating}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
  )
}
