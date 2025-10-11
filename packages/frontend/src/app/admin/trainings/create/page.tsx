"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Plus, Save, Eye, X, Search, GripVertical } from "lucide-react"
import Link from "next/link"

// Mock problems data
const mockProblems = [
  { id: "P1001", name: "A+B Problem", difficulty: "入门" },
  { id: "P1002", name: "消消乐", difficulty: "简单" },
  { id: "P1003", name: "动态规划练习", difficulty: "中等" },
  { id: "P1004", name: "图论基础", difficulty: "简单" },
  { id: "P1005", name: "最短路算法", difficulty: "中等" },
]

export default function CreateTrainingPage() {
  const [formData, setFormData] = useState({
    title: "",
    trainingIden: "",
    description: "",
    privateDescription: "",
    type: "公开",
    startTime: "",
    endTime: "",
    status: "draft"
  })

  const [problems, setProblems] = useState([])
  const [selectedProblems, setSelectedProblems] = useState([])
  const [searchTerm, setSearchTerm] = useState("")
  const [chapters, setChapters] = useState([
    { id: 1, title: "第一章", description: "", problems: [] }
  ])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddChapter = () => {
    const newId = Math.max(...chapters.map(c => c.id)) + 1
    setChapters(prev => [...prev, {
      id: newId,
      title: `第${chapters.length + 1}章`,
      description: "",
      problems: []
    }])
  }

  const handleRemoveChapter = (id: number) => {
    setChapters(prev => prev.filter(c => c.id !== id))
  }

  const handleChapterChange = (id: number, field: string, value: string) => {
    setChapters(prev => prev.map(chapter =>
      chapter.id === id ? { ...chapter, [field]: value } : chapter
    ))
  }

  const addProblemToChapter = (chapterId: number, problem: any) => {
    setChapters(prev => prev.map(chapter =>
      chapter.id === chapterId
        ? { ...chapter, problems: [...chapter.problems, problem] }
        : chapter
    ))
    setSelectedProblems(prev => prev.filter(p => p.id !== problem.id))
  }

  const removeProblemFromChapter = (chapterId: number, problemId: string) => {
    const problem = chapters.find(c => c.id === chapterId)?.problems.find(p => p.id === problemId)
    if (problem) {
      setSelectedProblems(prev => [...prev, problem])
    }
    setChapters(prev => prev.map(chapter =>
      chapter.id === chapterId
        ? { ...chapter, problems: chapter.problems.filter(p => p.id !== problemId) }
        : chapter
    ))
  }

  const filteredProblems = mockProblems.filter(problem =>
    problem.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    problem.id.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Creating training:", { ...formData, chapters })
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/trainings">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">创建训练</h1>
          <p className="text-muted-foreground">创建新的训练或题单</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mb-2">训练的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">训练标题 *</Label>
                <Input
                  id="title"
                  placeholder="请输入训练标题"
                  value={formData.title}
                  onChange={(e) => handleInputChange("title", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trainingIden">训练标识符 *</Label>
                <Input
                  id="trainingIden"
                  placeholder="如: cpp-basic"
                  value={formData.trainingIden}
                  onChange={(e) => handleInputChange("trainingIden", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="type">训练类型</Label>
                <Select value={formData.type} onValueChange={(value) => handleInputChange("type", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择类型" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="公开">公开训练</SelectItem>
                    <SelectItem value="私有">私有训练</SelectItem>
                    <SelectItem value="限时">限时训练</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">状态</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange("status", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择状态" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">草稿</SelectItem>
                    <SelectItem value="published">发布</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>时间设置</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mb-2">设置训练的时间范围</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="startTime">开始时间</Label>
                <Input
                  id="startTime"
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => handleInputChange("startTime", e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="endTime">结束时间</Label>
                <Input
                  id="endTime"
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => handleInputChange("endTime", e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="content" className="space-y-4">
          <TabsList>
            <TabsTrigger value="content">内容设置</TabsTrigger>
            <TabsTrigger value="description">描述信息</TabsTrigger>
            <TabsTrigger value="permissions">权限设置</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>章节管理</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mb-2">组织训练的章节和题目</CardDescription>
                  </div>
                  <Button type="button" onClick={handleAddChapter} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    添加章节
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {chapters.map((chapter) => (
                  <Card key={chapter.id} className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder="章节标题"
                          value={chapter.title}
                          onChange={(e) => handleChapterChange(chapter.id, 'title', e.target.value)}
                          className="font-medium max-w-xs"
                        />
                      </div>
                      <Button
                        type="button"
                        onClick={() => handleRemoveChapter(chapter.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <Textarea
                      placeholder="章节描述（可选）"
                      value={chapter.description}
                      onChange={(e) => handleChapterChange(chapter.id, 'description', e.target.value)}
                      className="mb-3"
                      rows={2}
                    />
                    <div className="space-y-2">
                      <Label>章节题目</Label>
                      <div className="border rounded-md p-3 min-h-[100px]">
                        {chapter.problems.length > 0 ? (
                          <div className="space-y-2">
                            {chapter.problems.map((problem) => (
                              <div key={problem.id} className="flex justify-between items-center bg-gray-50 p-2 rounded">
                                <span className="text-sm">{problem.id} {problem.name}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">{problem.difficulty}</Badge>
                                  <Button
                                    type="button"
                                    onClick={() => removeProblemFromChapter(chapter.id, problem.id)}
                                    variant="ghost"
                                    size="sm"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">拖拽题目到此处或点击下方题目添加</p>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}

                <Card className="p-4">
                  <CardTitle className="text-lg mb-3">题目库</CardTitle>
                  <div className="space-y-3">
                    <div className="relative">
                      <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="搜索题目..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-8"
                      />
                    </div>
                    <div className="max-h-60 overflow-y-auto space-y-2">
                      {filteredProblems.map((problem) => (
                        <div
                          key={problem.id}
                          className="flex justify-between items-center p-2 border rounded cursor-pointer hover:bg-gray-50"
                          onClick={() => {
                            const firstChapter = chapters[0]
                            if (firstChapter) {
                              addProblemToChapter(firstChapter.id, problem)
                            }
                          }}
                        >
                          <span className="text-sm">{problem.id} {problem.name}</span>
                          <Badge variant="outline" className="text-xs">{problem.difficulty}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="description" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>描述信息</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mb-2">设置训练的公开和私有描述</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">公开描述</Label>
                  <Textarea
                    id="description"
                    placeholder="请输入训练的公开描述，所有用户都可以看到"
                    value={formData.description}
                    onChange={(e) => handleInputChange("description", e.target.value)}
                    rows={6}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="privateDescription">私有描述</Label>
                  <Textarea
                    id="privateDescription"
                    placeholder="请输入训练的私有描述，仅管理员和创建者可以看到"
                    value={formData.privateDescription}
                    onChange={(e) => handleInputChange("privateDescription", e.target.value)}
                    rows={6}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="permissions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>权限设置</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mb-2">设置训练的访问和编辑权限</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">权限设置功能正在开发中...</p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-4">
          <Link href="/admin/trainings">
            <Button variant="outline">取消</Button>
          </Link>
          <Button type="button" variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            预览
          </Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            创建训练
          </Button>
        </div>
      </form>
    </div>
  )
}