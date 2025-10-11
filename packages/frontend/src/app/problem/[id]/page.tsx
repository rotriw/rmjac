"use client"

import { useState, useEffect } from "react"
import { useParams } from "next/navigation"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getProblemByIden, ProblemModel, ContentType, difficultyColors } from "@/lib/api"
import { TypstRenderer } from "@/components/typst-renderer"
import {
  Loader2,
  ExternalLink,
  Plus,
  Play,
  Save,
  History,
  Code2,
  Clock,
  MemoryStick,
  Tag,
  BookOpen,
  User,
  Calendar,
  CheckCircle,
  XCircle,
  FileText,
  Settings
} from "lucide-react"

export default function ProblemPage() {
    const params = useParams()
    const problemId = params.id as string

    const [problem, setProblem] = useState<ProblemModel | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedLanguage, setSelectedLanguage] = useState("cpp")
    const [code, setCode] = useState("")
    const [activeTab, setActiveTab] = useState("statement")
    const [selectedStatementIndex, setSelectedStatementIndex] = useState(0)

    useEffect(() => {
        const fetchProblem = async () => {
            try {
                setLoading(true)
                const problemData = await getProblemByIden(problemId)
                setProblem(problemData)
            } catch (err) {
                setError(err instanceof Error ? err.message : "Failed to load problem")
            } finally {
                setLoading(false)
            }
        }

        if (problemId) {
            fetchProblem()
        }
    }, [problemId])

    const renderContent = (content: any[]) => {
        return content.map((item, index) => {
            // 处理新的数据结构，包含iden字段
            if (item.iden && item.content) {
                // 判断是否为Typst格式（包含==标记或其他Typst语法）
                const isTypstContent = item.content.includes('==') ||
                                     item.content.includes('$') ||
                                     item.content.includes('#') ||
                                     item.iden.toLowerCase().includes('typst')

                if (isTypstContent) {
                    // 简单的Typst格式渲染，处理常见的Typst语法
                    const formatTypstContent = (text: string) => {
                        return text
                            // 处理标题 (== Header)
                            .replace(/^(==)\s*(.+)$/gm, '<h2 class="text-xl font-bold mt-4 mb-2">$2</h2>')
                            // 处理子标题 (=== Subheader)
                            .replace(/^(===)\s*(.+)$/gm, '<h3 class="text-lg font-semibold mt-3 mb-2">$2</h3>')
                            // 处理段落分隔
                            .replace(/\n\n/g, '</p><p class="mb-2">')
                            // 处理代码块
                            .replace(/```([^`]+)```/g, '<pre class="bg-gray-100 p-2 rounded mb-2 text-sm overflow-x-auto"><code>$1</code></pre>')
                            // 处理行内代码
                            .replace(/`([^`]+)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
                            // 处理粗体
                            .replace(/\*([^*]+)\*/g, '<strong>$1</strong>')
                            // 处理斜体
                            .replace(/_([^_]+)_/g, '<em>$1</em>');
                    };

                    return (
                        <div key={index} className="mb-4">
                            <div
                                className="prose prose-sm max-w-none text-sm leading-relaxed"
                                dangerouslySetInnerHTML={{
                                    __html: `<p class="mb-2">${formatTypstContent(item.content)}</p>`
                                }}
                            />
                        </div>
                    )
                }

                // 根据iden类型决定渲染方式
                switch (item.iden) {
                    case 'Background':
                    case 'Statement':
                    case 'Input':
                    case 'Output':
                    case 'Example':
                        return (
                            <div key={index} className="mb-4">
                                <h3 className="font-semibold mb-2 text-base">{item.iden}</h3>
                                <div className="text-sm leading-relaxed whitespace-pre-line bg-gray-50 p-3 rounded border">
                                    {item.content}
                                </div>
                            </div>
                        )
                    default:
                        return (
                            <p key={index} className="mb-2 text-sm leading-relaxed whitespace-pre-line">
                                {item.content}
                            </p>
                        )
                }
            }

            // 兼容旧的数据结构（包含type字段）
            switch (item.type) {
                case 'text':
                    return (
                        <p key={index} className="mb-2 text-sm leading-relaxed">
                            {item.content}
                        </p>
                    )
                case 'code':
                    return (
                        <pre key={index} className="bg-gray-100 p-2 rounded mb-2 text-sm overflow-x-auto">
                            <code>{item.content}</code>
                        </pre>
                    )
                case 'math':
                    return (
                        <div key={index} className="mb-2 text-sm">
                            <span className="font-mono bg-gray-50 px-1 rounded">
                                {item.content}
                            </span>
                        </div>
                    )
                case 'image':
                    return (
                        <img
                            key={index}
                            src={item.content}
                            alt="Problem image"
                            className="mb-2 max-w-full h-auto rounded"
                            onError={(e) => {
                                e.currentTarget.style.display = 'none'
                            }}
                        />
                    )
                case 'typst':
                    return (
                        <div key={index} className="mb-4">
                            <TypstRenderer
                                content={item.content}
                                className="w-full"
                            />
                        </div>
                    )
                default:
                    return (
                        <p key={index} className="mb-2 text-sm leading-relaxed whitespace-pre-line">
                            {item.content || JSON.stringify(item)}
                        </p>
                    )
            }
        })
    }

    const getDifficulty = (timeLimit: number, memoryLimit: number) => {
        if (timeLimit <= 1000 && memoryLimit <= 256) return "入门"
        if (timeLimit <= 2000 && memoryLimit <= 512) return "简单"
        if (timeLimit <= 3000 && memoryLimit <= 1024) return "中等"
        if (timeLimit <= 5000 && memoryLimit <= 2048) return "困难"
        return "极限"
    }

    if (loading) {
        return (
            <div className="container mx-auto py-6 px-4 md:px-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">加载题目中...</span>
                </div>
            </div>
        )
    }

    if (error || !problem) {
        return (
            <div className="container mx-auto py-6 px-4 md:px-6">
                <div className="flex items-center justify-center min-h-[400px]">
                    <div className="text-center">
                        <h2 className="font-semibold mb-2">题目不存在</h2>
                        <p className="text-muted-foreground">{error || "无法找到该题目"}</p>
                    </div>
                </div>
            </div>
        )
    }

    const firstStatement = problem.problem_statement_node[0]
    const firstLimit = firstStatement ? firstStatement[1] : null

    return (
        <div className="container mx-auto py-6 px-4 md:px-6">
                    {/* Header Section */}
                    <div className="mb-6">
                        <div className="flex items-center gap-4 mb-3">
                            <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                    <h1 className="font-semibold">LGP1001</h1>
                                    <h2 className="text-muted-foreground">{problem.problem_node.public.name}</h2>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                    <div className="flex items-center gap-1">
                                        <Calendar className="h-4 w-4" />
                                        <span>{problem.problem_node.public.creation_time}</span>
                                    </div>
                                    {firstLimit && (
                                        <>
                                            <div className="flex items-center gap-1">
                                                <Clock className="h-4 w-4" />
                                                <span>{firstLimit.public.time_limit / 1000}s</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <MemoryStick className="h-4 w-4" />
                                                <span>{firstLimit.public.memory_limit}MB</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <ExternalLink className="h-4 w-4" />
                                    原题链接
                                </Button>
                                <Button variant="outline" size="sm" className="flex items-center gap-2">
                                    <Plus className="h-4 w-4" />
                                    TODO LIST
                                </Button>
                            </div>
                        </div>

                        {/* Tags and Difficulty */}
                        <div className="flex flex-wrap gap-2">
                            {firstLimit && (
                                <Badge className={difficultyColors[getDifficulty(firstLimit.public.time_limit, firstLimit.public.memory_limit) as keyof typeof difficultyColors]}>
                                    {getDifficulty(firstLimit.public.time_limit, firstLimit.public.memory_limit)}
                                </Badge>
                            )}
                            {problem.tag.map((tag) => (
                                <Badge key={tag.node_id} variant="secondary">
                                    <Tag className="h-3 w-3 mr-1" />
                                    {tag.public.tag_name}
                                </Badge>
                            ))}
                        </div>
                    </div>

                    {/* Main Content */}
                    <div className="grid gap-6 lg:grid-cols-3">
                        {/* Left Column - Problem Statement */}
                        <div className="lg:col-span-2 space-y-4">
                            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                                <TabsList className="grid w-full grid-cols-4">
                                    <TabsTrigger value="statement" className="flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        题目
                                    </TabsTrigger>
                                    <TabsTrigger value="submit" className="flex items-center gap-2">
                                        <Code2 className="h-4 w-4" />
                                        提交
                                    </TabsTrigger>
                                    <TabsTrigger value="submissions" className="flex items-center gap-2">
                                        <History className="h-4 w-4" />
                                        记录
                                    </TabsTrigger>
                                    <TabsTrigger value="discussion" className="flex items-center gap-2">
                                        <Settings className="h-4 w-4" />
                                        讨论
                                    </TabsTrigger>
                                </TabsList>

                                <TabsContent value="statement" className="space-y-4">
                                    <Card className="shadow-none rounded-sm p-0">
                                        <CardContent className="p-3">
                                            <CardTitle className="text-sm flex items-center gap-2 mb-3">
                                                <BookOpen className="h-4 w-4" />
                                                题目描述
                                            </CardTitle>

                                            
                                            {/* 渲染选中的题面 */}
                                            {problem.problem_statement_node.map(([statement, limit], index) => {
                                                if (index !== selectedStatementIndex) return null;

                                                return (
                                                    <div key={statement.node_id} className="mb-6 last:mb-0">
                                                        <div className="prose prose-sm max-w-none mb-4">
                                                            {statement.public.statements && statement.public.statements.length > 0 ? (
                                                                renderContent(statement.public.statements)
                                                            ) : (
                                                                <div className="text-gray-500 text-sm italic">
                                                                    题目内容暂未提供
                                                                </div>
                                                            )}
                                                        </div>
                                                        <div className="flex items-center gap-4 text-sm text-muted-foreground p-3 bg-gray-50 rounded-lg">
                                                            <div className="flex items-center gap-1">
                                                                <Clock className="h-4 w-4" />
                                                                <span>时间限制: {limit.public.time_limit / 1000}s</span>
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <MemoryStick className="h-4 w-4" />
                                                                <span>内存限制: {limit.public.memory_limit}MB</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )
                                            })}
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="submit" className="space-y-4">
                                    <Card className="shadow-none rounded-sm p-0">
                                        <CardContent className="p-3">
                                            <CardTitle className="text-sm flex items-center gap-2 mb-3">
                                                <Code2 className="h-4 w-4" />
                                                代码提交
                                            </CardTitle>
                                            <div className="grid gap-4 md:grid-cols-2">
                                                <div>
                                                    <label className="text-sm font-medium mb-2 block">
                                                        编程语言
                                                    </label>
                                                    <Select value={selectedLanguage} onValueChange={setSelectedLanguage}>
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            <SelectItem value="cpp">C++ (GNU++17)</SelectItem>
                                                            <SelectItem value="java">Java 17</SelectItem>
                                                            <SelectItem value="python">Python 3.11</SelectItem>
                                                            <SelectItem value="c">C (GNU11)</SelectItem>
                                                            <SelectItem value="go">Go 1.21</SelectItem>
                                                            <SelectItem value="rust">Rust 1.75</SelectItem>
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <div className="flex items-end gap-2">
                                                    <Button variant="outline" size="sm" className="flex items-center gap-2">
                                                        <Save className="h-4 w-4" />
                                                        保存草稿
                                                    </Button>
                                                </div>
                                            </div>

                                            <div>
                                                <label className="text-sm font-medium mb-2 block">
                                                    代码编辑器
                                                </label>
                                                <Textarea
                                                    value={code}
                                                    onChange={(e) => setCode(e.target.value)}
                                                    placeholder="在此输入你的代码..."
                                                    className="min-h-[400px] font-mono text-sm resize-none"
                                                />
                                            </div>

                                            <div className="flex gap-2">
                                                <Button className="flex items-center gap-2">
                                                    <Play className="h-4 w-4" />
                                                    提交代码
                                                </Button>
                                                <Button variant="outline" size="sm">
                                                    运行测试
                                                </Button>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="submissions" className="space-y-4">
                                    <Card className="shadow-none rounded-sm p-0">
                                        <CardContent className="p-3">
                                            <CardTitle className="text-sm flex items-center gap-2 mb-3">
                                                <History className="h-4 w-4" />
                                                提交记录
                                            </CardTitle>
                                            <div className="text-center py-8">
                                                <History className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                                                <h3 className="text-sm font-medium mb-2">暂无提交记录</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    提交代码后，你的提交记录将显示在这里
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>

                                <TabsContent value="discussion" className="space-y-4">
                                    <Card className="shadow-none rounded-sm p-0">
                                        <CardContent className="p-3">
                                            <CardTitle className="text-sm flex items-center gap-2 mb-3">
                                                <Settings className="h-4 w-4" />
                                                题目讨论
                                            </CardTitle>
                                            <div className="text-center py-8">
                                                <Settings className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
                                                <h3 className="text-sm font-medium mb-2">讨论功能开发中</h3>
                                                <p className="text-xs text-muted-foreground">
                                                    敬请期待题目讨论区功能
                                                </p>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </TabsContent>
                            </Tabs>
                        </div>

                        {/* Right Column - Sidebar */}
                        <div className="space-y-4">
                            {/* 题面来源选择器 */}
                            {problem.problem_statement_node.length > 1 && (
                                <Card className="shadow-none rounded-sm p-0">
                                    <CardContent className="p-3">
                                        <CardTitle className="text-sm mb-3">题面选择</CardTitle>
                                        <select
                                            value={selectedStatementIndex}
                                            onChange={(e) => setSelectedStatementIndex(parseInt(e.target.value))}
                                            className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                                        >
                                            {problem.problem_statement_node.map(([statement, limit], index) => (
                                                <option key={statement.node_id} value={index}>
                                                    {statement.public.source || '未知来源'}
                                                </option>
                                            ))}
                                        </select>
                                        <div className="mt-2 text-xs text-gray-500">
                                            当前显示: {problem.problem_statement_node[selectedStatementIndex][0].public.source || '未知来源'}
                                        </div>
                                    </CardContent>
                                </Card>
                            )}

                            {/* 当前题面来源信息 */}
                            <Card className="shadow-none rounded-sm p-0 bg-blue-50 border-blue-200">
                                <CardContent className="p-3">
                                    <CardTitle className="text-sm mb-3 flex items-center gap-2">
                                        <ExternalLink className="h-4 w-4 text-blue-600" />
                                        题目来源
                                    </CardTitle>
                                    <div className="text-sm text-blue-800 font-medium">
                                        {problem.problem_statement_node[selectedStatementIndex][0].public.source || '未知来源'}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-none rounded-sm p-0">
                                <CardContent className="p-3">
                                    <CardTitle className="text-sm mb-3">题目信息</CardTitle>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">难度</span>
                                        {firstLimit && (
                                            <Badge className={`text-xs ${difficultyColors[getDifficulty(firstLimit.public.time_limit, firstLimit.public.memory_limit) as keyof typeof difficultyColors]}`}>
                                                {getDifficulty(firstLimit.public.time_limit, firstLimit.public.memory_limit)}
                                            </Badge>
                                        )}
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">时间限制</span>
                                        <span className="text-xs font-medium">
                                            {firstLimit ? `${firstLimit.public.time_limit / 1000}s` : "N/A"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">内存限制</span>
                                        <span className="text-xs font-medium">
                                            {firstLimit ? `${firstLimit.public.memory_limit}MB` : "N/A"}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">提交数</span>
                                        <span className="text-xs font-medium">0</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">通过数</span>
                                        <span className="text-xs font-medium">0</span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-muted-foreground">通过率</span>
                                        <span className="text-xs font-medium">-</span>
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-none rounded-sm p-0">
                                <CardContent className="p-3">
                                    <CardTitle className="text-sm mb-3">相关标签</CardTitle>
                                    <div className="flex flex-wrap gap-2">
                                        {problem.tag.map((tag) => (
                                            <Badge key={tag.node_id} variant="secondary" className="text-xs bg-gray-100 text-gray-700 cursor-pointer hover:bg-blue-50 hover:text-blue-700">
                                                {tag.public.tag_name}
                                            </Badge>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>

                            <Card className="shadow-none rounded-sm p-0">
                                <CardContent className="p-3">
                                    <CardTitle className="text-sm mb-3">快速操作</CardTitle>
                                    <div className="space-y-2">
                                        <Button variant="outline" className="w-full justify-start h-7 text-xs" size="sm">
                                            <Plus className="h-3 w-3 mr-2" />
                                            加入收藏
                                        </Button>
                                        <Button variant="outline" className="w-full justify-start h-7 text-xs" size="sm">
                                            <FileText className="h-3 w-3 mr-2" />
                                            查看题解
                                        </Button>
                                        <Button variant="outline" className="w-full justify-start h-7 text-xs" size="sm">
                                            <History className="h-3 w-3 mr-2" />
                                            统计数据
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        </div>
                    </div>
        </div>
    )
}
