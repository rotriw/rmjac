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
import { ArrowLeft, Plus, Upload, Save, Eye, X } from "lucide-react"
import Link from "next/link"

export default function CreateProblemPage() {
  const [formData, setFormData] = useState({
    problemId: "",
    problemName: "",
    difficulty: "简单",
    description: "",
    inputFormat: "",
    outputFormat: "",
    sampleInput: "",
    sampleOutput: "",
    timeLimit: "1",
    memoryLimit: "256",
    tags: [] as string[],
    newTag: "",
    status: "draft"
  })

  const [statements, setStatements] = useState([
    {
      id: 1,
      title: "题目描述",
      content: "",
      source: ""
    }
  ])

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const handleAddTag = () => {
    if (formData.newTag.trim() && !formData.tags.includes(formData.newTag.trim())) {
      setFormData(prev => ({
        ...prev,
        tags: [...prev.tags, prev.newTag.trim()],
        newTag: ""
      }))
    }
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setFormData(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToRemove)
    }))
  }

  const handleAddStatement = () => {
    const newId = Math.max(...statements.map(s => s.id)) + 1
    setStatements(prev => [...prev, {
      id: newId,
      title: `题面 ${newId}`,
      content: "",
      source: ""
    }])
  }

  const handleRemoveStatement = (id: number) => {
    setStatements(prev => prev.filter(s => s.id !== id))
  }

  const handleStatementChange = (id: number, field: string, value: string) => {
    setStatements(prev => prev.map(s =>
      s.id === id ? { ...s, [field]: value } : s
    ))
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    // Handle form submission
    console.log("Creating problem:", { ...formData, statements })
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex items-center gap-4 mb-6">
        <Link href="/admin/problems">
          <Button variant="outline" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            返回
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">创建题目</h1>
          <p className="text-muted-foreground">创建新的编程题目</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>基本信息</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mb-2">题目的基本信息</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="problemId">题目编号 *</Label>
                <Input
                  id="problemId"
                  placeholder="如: P1001"
                  value={formData.problemId}
                  onChange={(e) => handleInputChange("problemId", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="problemName">题目标题 *</Label>
                <Input
                  id="problemName"
                  placeholder="请输入题目标题"
                  value={formData.problemName}
                  onChange={(e) => handleInputChange("problemName", e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="difficulty">难度</Label>
                <Select value={formData.difficulty} onValueChange={(value) => handleInputChange("difficulty", value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="选择难度" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="入门">入门</SelectItem>
                    <SelectItem value="简单">简单</SelectItem>
                    <SelectItem value="中等">中等</SelectItem>
                    <SelectItem value="困难">困难</SelectItem>
                    <SelectItem value="极限">极限</SelectItem>
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

              <div className="space-y-2">
                <Label>标签</Label>
                <div className="flex space-x-2">
                  <Input
                    placeholder="添加标签"
                    value={formData.newTag}
                    onChange={(e) => handleInputChange("newTag", e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddTag())}
                  />
                  <Button type="button" onClick={handleAddTag} size="sm">
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => handleRemoveTag(tag)}>
                      {tag}
                      <X className="ml-1 h-3 w-3" />
                    </Badge>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>运行限制</CardTitle>
              <CardDescription className="text-xs text-muted-foreground mb-2">设置题目的运行参数</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="timeLimit">时间限制 (秒)</Label>
                <Input
                  id="timeLimit"
                  type="number"
                  placeholder="1"
                  value={formData.timeLimit}
                  onChange={(e) => handleInputChange("timeLimit", e.target.value)}
                  min="0.1"
                  step="0.1"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="memoryLimit">内存限制 (MB)</Label>
                <Input
                  id="memoryLimit"
                  type="number"
                  placeholder="256"
                  value={formData.memoryLimit}
                  onChange={(e) => handleInputChange("memoryLimit", e.target.value)}
                  min="1"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="statements" className="space-y-4">
          <TabsList>
            <TabsTrigger value="statements">题面内容</TabsTrigger>
            <TabsTrigger value="samples">样例</TabsTrigger>
            <TabsTrigger value="testcases">测试数据</TabsTrigger>
          </TabsList>

          <TabsContent value="statements" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle>题面管理</CardTitle>
                    <CardDescription className="text-xs text-muted-foreground mb-2">管理题目的不同版本题面</CardDescription>
                  </div>
                  <Button type="button" onClick={handleAddStatement} variant="outline" size="sm">
                    <Plus className="mr-2 h-4 w-4" />
                    添加题面
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {statements.map((statement) => (
                  <Card key={statement.id} className="p-4">
                    <div className="flex justify-between items-center mb-3">
                      <Input
                        placeholder="题面标题"
                        value={statement.title}
                        onChange={(e) => handleStatementChange(statement.id, 'title', e.target.value)}
                        className="font-medium"
                      />
                      <Button
                        type="button"
                        onClick={() => handleRemoveStatement(statement.id)}
                        variant="ghost"
                        size="sm"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="space-y-3">
                      <div>
                        <Label>题面内容</Label>
                        <Textarea
                          placeholder="请输入题面内容，支持 Markdown 格式"
                          value={statement.content}
                          onChange={(e) => handleStatementChange(statement.id, 'content', e.target.value)}
                          rows={10}
                        />
                      </div>
                      <div>
                        <Label>来源</Label>
                        <Input
                          placeholder="题目来源，如：洛谷 P1001"
                          value={statement.source}
                          onChange={(e) => handleStatementChange(statement.id, 'source', e.target.value)}
                        />
                      </div>
                    </div>
                  </Card>
                ))}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="samples" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>样例输入输出</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mb-2">设置题目的样例输入和输出</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="sampleInput">样例输入</Label>
                    <Textarea
                      id="sampleInput"
                      placeholder="请输入样例输入"
                      value={formData.sampleInput}
                      onChange={(e) => handleInputChange("sampleInput", e.target.value)}
                      rows={6}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="sampleOutput">样例输出</Label>
                    <Textarea
                      id="sampleOutput"
                      placeholder="请输入样例输出"
                      value={formData.sampleOutput}
                      onChange={(e) => handleInputChange("sampleOutput", e.target.value)}
                      rows={6}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="testcases" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>测试数据</CardTitle>
                <CardDescription className="text-xs text-muted-foreground mb-2">上传和管理测试数据</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <Upload className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground mb-4">
                    拖拽文件到此处或点击上传测试数据
                  </p>
                  <Button variant="outline">
                    <Upload className="mr-2 h-4 w-4" />
                    选择文件
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-end space-x-4">
          <Link href="/admin/problems">
            <Button variant="outline">取消</Button>
          </Link>
          <Button type="button" variant="outline">
            <Eye className="mr-2 h-4 w-4" />
            预览
          </Button>
          <Button type="submit">
            <Save className="mr-2 h-4 w-4" />
            保存题目
          </Button>
        </div>
      </form>
    </div>
  )
}