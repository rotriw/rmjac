"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { StandardCard } from "@/components/card/card"
import { getSubmitOptions, submitCode, JudgePlatformOptions } from "@/api/client/submit"
import { Select, SelectItem } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Loader2 } from "lucide-react"

interface Record {
  node_id: number
  public: {
    record_status: number
    time_elapsed: number
    memory_used: number
    language: string
    creation_time: string
  }
}

interface ProblemClientProps {
  problemId: string
  statementId: number
  userRecords?: Record[]
  isLoggedIn?: boolean
  platform: string
}

export default function ProblemClient({
  problemId,
  statementId,
  userRecords = [],
  isLoggedIn = false,
  platform
}: ProblemClientProps) {
  const [code, setCode] = useState("")
  const [language, setLanguage] = useState("")
  const [options, setOptions] = useState<JudgePlatformOptions | null>(null)
  const [selectedOptions, setSelectedOptions] = useState<{ [key: string]: string | boolean | number }>({})
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [isLoadingOptions, setIsLoadingOptions] = useState(true)
  const [vjudgeId] = useState<number>(1)
  const [publicView] = useState(true)

  const currentLanguageOptions = options?.find((l) => l.name === language)

  const deriveContestAndProblem = (iden: string) => {
    // 尝试从题号推断 contest_id 和 problem_id
    const trimmed = iden.trim()
    // 形如 1234A 或 123A1
    const cf = trimmed.match(/^([0-9]+)([A-Za-z][0-9]*)$/)
    if (cf) {
      return { contestId: cf[1], problemId: cf[2] }
    }
    // 形如 abc123_a 或 abc123-a
    const at = trimmed.match(/^([a-z]+[0-9]+)[-_]([A-Za-z0-9]+)$/i)
    if (at) {
      return { contestId: at[1], problemId: at[2] }
    }
    // 形如 1234/567 or 1234/ABC
    const slash = trimmed.split("/")
    if (slash.length === 2) {
      return { contestId: slash[0], problemId: slash[1] }
    }
    return { contestId: trimmed, problemId: trimmed }
  }

  useEffect(() => {
    async function fetchOptions() {
      try {
        setIsLoadingOptions(true)
        const data = await getSubmitOptions(platform)
        setOptions(data)
        if (data && data.length > 0) {
          setLanguage(data[0].name)
        }
      } catch {
        toast.error("获取提交选项失败")
      } finally {
        setIsLoadingOptions(false)
      }
    }
    fetchOptions()
  }, [platform])

  useEffect(() => {
    if (!options || !language) return
    const lang = options.find((l) => l.name === language)
    if (!lang) return

    const initialOptions: { [key: string]: string | boolean | number } = {}
    const derived = deriveContestAndProblem(problemId)
    for (const opt of lang.allow_option) {
      if (opt.name === "--c_id=") {
        initialOptions[opt.name] = derived.contestId
        continue
      }
      if (opt.name === "--p_id=") {
        initialOptions[opt.name] = derived.problemId
        continue
      }
      if (opt.allowed_option && opt.allowed_option.length > 0) {
        initialOptions[opt.name] = opt.allowed_option[0]
      } else if (opt.is_input) {
        initialOptions[opt.name] = ""
      } else {
        initialOptions[opt.name] = false
      }
    }
    setSelectedOptions(initialOptions)
  }, [options, language, problemId])

  const handleSubmit = async () => {
    if (!isLoggedIn) {
      toast.error("请先登录后再提交代码")
      return
    }
    if (!code.trim()) {
      toast.error("代码不能为空")
      return
    }
    if (!language) {
      toast.error("请选择编程语言")
      return
    }

    if (!vjudgeId) {
      toast.error("请选择一个 Vjudge 账号")
      return
    }

    try {
      setIsSubmitting(true)
      const judge_option: { [key: string]: string } = {}
      for (const [key, value] of Object.entries(selectedOptions)) {
        judge_option[key] = String(value)
      }
      const result = await submitCode({
        statement_id: statementId,
        vjudge_id: vjudgeId,
        code,
        language,
        judge_option,
        public_view: publicView
      })
      toast.success(`提交成功，记录 ID: ${result.record_id}`)
      // Optionally redirect to record page or refresh history
    } catch (error) {
      const msg = error instanceof Error ? error.message : "提交失败";
      toast.error(msg)
    } finally {
      setIsSubmitting(false)
    }
  }

  const getStatusText = (status: number) => {
    const statusMap: { [key: number]: string } = {
      0: "Pending",
      1: "Running",
      2: "Accepted",
      3: "Wrong Answer",
      4: "Time Limit Exceeded",
      5: "Memory Limit Exceeded",
      6: "Runtime Error",
      7: "Compile Error",
    }
    return statusMap[status] || "Unknown"
  }

  return (
    <Tabs defaultValue="submit" className="mt-6">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="submit">代码编辑</TabsTrigger>
        <TabsTrigger value="history">提交记录</TabsTrigger>
      </TabsList>
      
      <TabsContent value="submit">
        <StandardCard title="代码编辑器">
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>编程语言</Label>
                {isLoadingOptions ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="size-4 animate-spin" />
                    加载中...
                  </div>
                ) : (
                  <Select value={language} onChange={(e) => setLanguage(e.target.value)}>
                    <SelectItem value="" disabled>
                      选择语言
                    </SelectItem>
                    {options?.map((lang) => (
                      <SelectItem key={lang.name} value={lang.name}>
                        {lang.name}
                      </SelectItem>
                    ))}
                  </Select>
                )}
              </div>

              {currentLanguageOptions?.allow_option?.filter((opt) => opt.is_compile).map((opt) => (
                <div key={opt.name} className="space-y-2">
                  <Label>{opt.name}</Label>

                  {opt.allowed_option && opt.allowed_option.length > 0 ? (
                    <Select
                      value={String(selectedOptions[opt.name] ?? "")}
                      onChange={(e) => {
                        const val = e.target.value
                        setSelectedOptions((prev) => ({ ...prev, [opt.name]: val }))
                      }}
                    >
                      {opt.allowed_option.map((value) => (
                        <SelectItem key={value} value={value}>
                          {value}
                        </SelectItem>
                      ))}
                    </Select>
                  ) : opt.is_input ? (
                    <Input
                      value={String(selectedOptions[opt.name] ?? "")}
                      onChange={(e) => setSelectedOptions((prev) => ({ ...prev, [opt.name]: e.target.value }))}
                      placeholder="请输入选项值"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 py-2">
                      <input
                        type="checkbox"
                        id={`opt-${opt.name}`}
                        checked={Boolean(selectedOptions[opt.name])}
                        onChange={(e) => {
                          const val = e.target.checked
                          setSelectedOptions((prev) => ({ ...prev, [opt.name]: val }))
                        }}
                        className="size-4 rounded border-gray-300 text-primary focus:ring-primary"
                      />
                      <label htmlFor={`opt-${opt.name}`} className="sr-only">
                        {opt.name}
                      </label>
                    </div>
                  )}
                </div>
              ))}
            </div>
            
            <Textarea
              placeholder="在这里编写你的代码..."
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="min-h-96 font-mono text-sm"
            />
            
            <div className="flex justify-between items-center">
              <Button
                onClick={handleSubmit}
                disabled={!code.trim() || isSubmitting || isLoadingOptions}
                variant={isLoggedIn ? "default" : "outline"}
              >
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isLoggedIn ? "提交代码" : "登录后提交"}
              </Button>
            </div>
          </div>
        </StandardCard>
      </TabsContent>
      
      <TabsContent value="history">
        <StandardCard title="历史提交">
          {userRecords && userRecords.length > 0 ? (
            <div className="space-y-2">
              {userRecords.map((record) => (
                <div key={record.node_id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <Badge
                      variant={record.public.record_status === 2 ? "default" : "destructive"}
                    >
                      {getStatusText(record.public.record_status)}
                    </Badge>
                    <span className="text-sm text-gray-600">
                      {record.public.language} • {record.public.time_elapsed}ms • {record.public.memory_used}KB
                    </span>
                  </div>
                  <span className="text-sm text-gray-500">
                    {new Date(record.public.creation_time).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500 py-8">
              暂无提交记录
            </div>
          )}
        </StandardCard>
      </TabsContent>
    </Tabs>
  )
}
