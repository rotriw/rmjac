"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Plus,
  Search,
  Calendar,
  Users,
  BookOpen,
  Target,
  Star,
  Clock,
  Filter,
  ArrowUpRight,
  Eye,
  Edit
} from "lucide-react"
import { getAllTrainings, Training, TrainingsResponse } from "@/lib/api"

// Mock training data
const mockTrainings = [
  {
    id: "tanxin1",
    node_id: 1,
    name: "贪心算法基础训练",
    description: "学习贪心算法的基本思想和经典应用，包括区间调度、背包问题等。",
    difficulty: "简单",
    type: "公开",
    problems: 8,
    participants: 156,
    rating: 4.8,
    creationTime: "2024-01-15",
    endTime: "2024-12-31",
    tags: ["贪心", "算法基础", "区间调度"],
    author: "User1",
    chapters: [
      { title: "第一章：贪心思想入门", problems: 3 },
      { title: "第二章：区间调度问题", problems: 5 }
    ]
  },
  {
    id: "dp_basic",
    node_id: 2,
    name: "动态规划入门",
    description: "从零开始学习动态规划，掌握状态转移方程的设计思路。",
    difficulty: "中等",
    type: "公开",
    problems: 12,
    participants: 89,
    rating: 4.6,
    creationTime: "2024-02-01",
    endTime: "2024-12-31",
    tags: ["动态规划", "状态转移", "基础算法"],
    author: "User2",
    chapters: [
      { title: "第一章：DP基本概念", problems: 4 },
      { title: "第二章：线性DP", problems: 8 }
    ]
  },
  {
    id: "graph_advanced",
    node_id: 3,
    name: "图论进阶",
    description: "深入学习图的高级算法，包括网络流、强连通分量等。",
    difficulty: "困难",
    type: "私有",
    problems: 15,
    participants: 34,
    rating: 4.9,
    creationTime: "2024-03-01",
    endTime: "2024-12-31",
    tags: ["图论", "网络流", "高级算法"],
    author: "User3",
    chapters: [
      { title: "第一章：最短路进阶", problems: 5 },
      { title: "第二章：网络流基础", problems: 10 }
    ]
  }
]

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

const getTypeColor = (type: string) => {
  switch (type) {
    case "公开": return "bg-green-50 text-green-700 border-green-200"
    case "私有": return "bg-red-50 text-red-700 border-red-200"
    case "限时": return "bg-blue-50 text-blue-700 border-blue-200"
    default: return "bg-gray-50 text-gray-700 border-gray-200"
  }
}

// Helper function to transform training data from API to match UI format
const transformTrainingData = (apiTraining: Training) => ({
  id: apiTraining.iden,
  node_id: apiTraining.node_id,
  name: apiTraining.name,
  description: apiTraining.description || "暂无描述",
  difficulty: "中等", // TODO: Add difficulty to API
  type: apiTraining.training_type === "公开" ? "公开" : "私有",
  problems: 0, // TODO: Add problem count to API
  participants: 0, // TODO: Add participant count to API
  rating: 4.5, // TODO: Add rating to API
  creationTime: new Date(apiTraining.start_time).toLocaleDateString(),
  endTime: new Date(apiTraining.end_time).toLocaleDateString(),
  tags: ["算法训练", "练习"], // TODO: Add tags to API
  author: "管理员", // TODO: Add author to API
  chapters: [
    { title: "第一章：基础练习", problems: 0 },
    { title: "第二章：进阶训练", problems: 0 }
  ]
})

export default function TrainingPage() {
  const [trainings, setTrainings] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedDifficulty, setSelectedDifficulty] = useState("all")
  const [selectedType, setSelectedType] = useState("all")

  useEffect(() => {
    const fetchTrainings = async () => {
      try {
        setLoading(true)
        const response = await getAllTrainings()
        const transformedTrainings = response.trainings.map(transformTrainingData)
        setTrainings(transformedTrainings)
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trainings")
        // Fallback to mock data if API fails
        setTrainings(mockTrainings)
      } finally {
        setLoading(false)
      }
    }

    fetchTrainings()
  }, [])

  const filteredTrainings = trainings.filter(training => {
    const matchesSearch = training.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         training.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         training.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
    const matchesDifficulty = selectedDifficulty === "all" || training.difficulty === selectedDifficulty
    const matchesType = selectedType === "all" || training.type === selectedType

    return matchesSearch && matchesDifficulty && matchesType
  })

  const renderTrainingCard = (training: any) => (
    <Card key={training.id} className="shadow-none rounded-sm p-0">
      <CardContent className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Badge className={`text-xs ${getDifficultyColor(training.difficulty)}`}>
            {training.difficulty}
          </Badge>
          <Badge variant="outline" className={`text-xs ${getTypeColor(training.type)}`}>
            {training.type}
          </Badge>
          <div className="flex items-center gap-1 ml-auto">
            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
            <span className="text-xs text-muted-foreground">{training.rating}</span>
          </div>
        </div>

        <CardTitle className="text-sm mb-2 group-hover:text-blue-600 transition-colors">
          <Link href={`/training/${training.id}`} className="hover:underline">
            {training.name}
          </Link>
        </CardTitle>

        <div className="text-xs text-muted-foreground mb-2 line-clamp-2">
          {training.description}
        </div>

        <div className="flex items-center gap-3 text-xs text-muted-foreground mb-2">
          <div className="flex items-center gap-1">
            <BookOpen className="h-3 w-3" />
            <span>{training.problems}题</span>
          </div>
          <div className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            <span>{training.participants}人</span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="h-3 w-3" />
            <span>{training.creationTime}</span>
          </div>
        </div>

        <div className="flex flex-wrap gap-1 mb-3">
          {training.tags.slice(0, 3).map(tag => (
            <Badge key={tag} variant="secondary" className="text-xs bg-gray-100 text-gray-700">
              {tag}
            </Badge>
          ))}
          {training.tags.length > 3 && (
            <Badge variant="secondary" className="text-xs bg-gray-100 text-gray-700">
              +{training.tags.length - 3}
            </Badge>
          )}
        </div>

        <div className="flex items-center justify-between">
          <div className="text-xs text-muted-foreground">
            by {training.author}
          </div>
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" className="h-7 px-3 text-xs">
              <Eye className="h-3 w-3 mr-1" />
              查看
            </Button>
            <Button size="sm" className="h-7 px-3 text-xs">
              <Target className="h-3 w-3 mr-1" />
              开始训练
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  )

  if (loading) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-muted-foreground">加载训练列表中...</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <CardTitle className="font-semibold mb-1">训练题单</CardTitle>
          <p className="text-xs text-muted-foreground mb-2">
            发现和参与各种编程训练计划，提升你的算法能力
          </p>
          {error && (
            <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
              ⚠️ 使用演示数据：{error}
            </div>
          )}
        </div>
        <Link href="/training/create">
          <Button className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            创建训练
          </Button>
        </Link>
      </div>

      <Tabs defaultValue="all" className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <TabsList>
            <TabsTrigger value="all">全部训练</TabsTrigger>
            <TabsTrigger value="my">我的训练</TabsTrigger>
            <TabsTrigger value="recommended">推荐训练</TabsTrigger>
          </TabsList>

          <div className="flex gap-2 w-full sm:w-auto">
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="搜索训练..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            <Button variant="outline" size="icon">
              <Filter className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <Badge
            variant={selectedDifficulty === "all" ? "default" : "outline"}
            className="cursor-pointer"
            onClick={() => setSelectedDifficulty("all")}
          >
            全部难度
          </Badge>
          {["入门", "简单", "中等", "困难", "极限"].map(difficulty => (
            <Badge
              key={difficulty}
              variant={selectedDifficulty === difficulty ? "default" : "outline"}
              className="cursor-pointer"
              onClick={() => setSelectedDifficulty(difficulty)}
            >
              {difficulty}
            </Badge>
          ))}
        </div>

        <TabsContent value="all" className="space-y-0">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {filteredTrainings.map(renderTrainingCard)}
          </div>
          {filteredTrainings.length === 0 && (
            <div className="text-center py-12">
              <BookOpen className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">暂无匹配的训练</h3>
              <p className="text-muted-foreground mb-4">
                尝试调整搜索条件或创建新的训练计划
              </p>
              <Link href="/training/create">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  创建训练
                </Button>
              </Link>
            </div>
          )}
        </TabsContent>

        <TabsContent value="my" className="space-y-0">
          <div className="text-center py-12">
            <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">我的训练</h3>
            <p className="text-muted-foreground mb-4">
              你还没有参与任何训练计划
            </p>
            <Button>
              浏览训练
            </Button>
          </div>
        </TabsContent>

        <TabsContent value="recommended" className="space-y-0">
          <div className="text-center py-12">
            <Star className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium mb-2">推荐训练</h3>
            <p className="text-muted-foreground mb-4">
              基于你的学习进度，为你推荐以下训练
            </p>
          </div>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {mockTrainings.slice(0, 2).map(renderTrainingCard)}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}