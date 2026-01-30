"use client"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { TitleCard } from "@/components/card/card"
import { FormQuery, FormField } from "@/components/tools/query";
import { StandardCard } from "@/components/card/card";
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { DetailData } from "@/components/problem/detail-data"
import { ProblemData } from "./types";
import { postCreate as createProblem } from "@/api/client/api_problem_create";
import { postSearch } from "@/api/client/api_problem_search"
import { ProblemListItem, ProblemListQuery, ProblemNode, ProblemStatementProp } from "@rmjac/api-declare";

export function ProblemTool() {
  const searchParams = useSearchParams()
  const [formValues, setFormValues] = useState<Record<string, string | string[] | ProblemData[]>>({})
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; data?: ProblemNode | unknown } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [searchKeyword, setSearchKeyword] = useState("")
  const [searchResults, setSearchResults] = useState<ProblemListItem[]>([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  
  // Handle form submission
  const handleSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);
    
    const currentProblems = (formValues.problems as ProblemData[]) || []
    const problemStatements: ProblemStatementProp[] = (currentProblems.length > 0 ? currentProblems : [
      {
        id: "default",
        problem_source: "",
        problem_iden: "default",
        modules: [
          { id: "default-description", title: "题面描述", content: "请在此处填写题目描述", type: "description" }
        ],
        sampleGroups: []
      }
    ]).map((problem) => {
      const modules = problem.modules.map((module) => ({
        iden: module.type,
        content: module.content
      }))
      return {
        statement_source: problem.problem_source || "",
        iden: problem.problem_iden || "default",
        problem_statements: modules,
        time_limit: 1000,
        memory_limit: 256,
        sample_group: problem.sampleGroups.length > 0 ? problem.sampleGroups.map(sample => [sample.input, sample.output]) : [],
        show_order: modules.map(module => module.iden),
        page_source: null,
        page_rendered: null,
        problem_difficulty: null,
        judge_option: null,
      }
    })
    
    const submissionData = {
      problem_iden: (formValues.iden as string) || currentProblems[0]?.problem_iden || "",
      problem_name: (formValues.name as string) || "未命名题目",
      problem_statement: problemStatements,
      tags: Array.isArray(formValues.tags) ? (formValues.tags as string[]) : []
    }
    
    try {
      const newProblem = await createProblem(submissionData)
      
      setSubmitResult({
        success: true,
        message: `题目创建成功！\n题目名称: ${submissionData.problem_name}\n题目标识: ${submissionData.problem_iden}`,
        data: newProblem.problem
      })
    } catch (error) {
      setSubmitResult({
        success: false,
        message: `网络错误: ${error instanceof Error ? error.message : '未知网络错误'}`,
        data: error
      })
    } finally {
      setIsSubmitting(false)
    }
  }
  const getProblemName = (item: ProblemListItem) => item.model.problem_node.public.name
  const getProblemTags = (item: ProblemListItem) => item.model.tag.map(t => t.public.tag_name)

  const handleProblemSearch = async () => {
    setSearching(true)
    setSearchError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: any = {
        page: 1,
        per_page: 10,
        name: searchKeyword || null,
        tag: null
      }
      const response = await postSearch({ query: query as ProblemListQuery })
      setSearchResults(response.problems)
    } catch (error) {
      setSearchError(error instanceof Error ? error.message : "搜索失败")
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleApplyProblem = (item: ProblemListItem) => {
    const name = getProblemName(item)
    const tags = getProblemTags(item)
    setFormValues((prev) => ({
      ...prev,
      name,
      iden: item.iden,
      tags
    }))
  }
  const props: FormField[] = [
    {
      type: "group",
      title: "基本信息",
      children: [{
        type: "input",
        name: "name",
        title: "题目名称"
      }, {
        type: "input",
        name: "iden",
        title: "题目的 iden（仅限题目）"
      }, {
        type: "tags",
        name: "tags",
        title: "题目标签"
      }]
    },
    {
      type: "group",
      title: "快捷工具",
      children: [{
        type: "group",
        title: "从链接快速引用",
        children: [{
          type: "input",
          name: "quick-quote",
          title: "从链接远程引入",
        }, {
          type: "button",
          title: "引入",
          onClick: () => {
            // Handle quick quote functionality
            console.log("Quick quote clicked:", formValues["quick-quote"])
          }
        }]
      }]
    },
    {
      type: "group",
      title: "提交",
      children: [{
        type: "button",
        title: isSubmitting ? "提交中..." : "提交题目",
        onClick: handleSubmit,
      }]
    },

  ];
  
  useEffect(() => {
    const initialValues: Record<string, string> = {}
    searchParams.forEach((value, key) => {
      initialValues[key] = value
    })
    setFormValues(initialValues)
  }, [searchParams])
  
  const handleFormChange = (values: Record<string, string | string[] | ProblemData[]>) => {
    setFormValues(values)
  }
  
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <TitleCard title="创建题目" description="create" />
      <StandardCard title="搜题">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="输入题目名称或ID"
              value={searchKeyword}
              onChange={(e) => setSearchKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleProblemSearch()
                }
              }}
              className="h-8"
            />
            <div className="flex gap-2">
              <Button onClick={handleProblemSearch} size="sm" disabled={searching}>
                {searching ? "搜索中..." : "搜索"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchKeyword("")
                  setSearchResults([])
                  setSearchError(null)
                }}
              >
                清空
              </Button>
            </div>
          </div>
          {searchError && (
            <div className="text-sm text-red-600">
              {searchError}
            </div>
          )}
          <div className="rounded-md border">
            {searching ? (
              <div className="text-sm text-muted-foreground py-6 text-center">搜索中...</div>
            ) : searchResults.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">暂无结果</div>
            ) : (
              <div className="divide-y">
                {searchResults.map((item) => (
                  <div key={item.iden} className="flex flex-col sm:flex-row sm:items-center gap-2 p-3">
                    <div className="flex-1">
                      <div className="font-medium">{getProblemName(item)}</div>
                      <div className="text-xs text-muted-foreground">ID: {item.iden}</div>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {getProblemTags(item).slice(0, 4).map((tag) => (
                          <Badge key={tag} variant="secondary" className="text-xs font-normal">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => handleApplyProblem(item)}>
                      带入
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </StandardCard>
      <FormQuery
        fields={props}
        values={formValues as Record<string, string | string[]>}
        onChange={handleFormChange}
      />
      <StandardCard title="题面详情">
        <DetailData values={formValues} onChange={handleFormChange} />
      </StandardCard>
      
      {/* 结果显示Card */}
      {submitResult && (
        <StandardCard
          title={submitResult.success ? "提交成功" : "提交失败"}
          className={submitResult.success ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}
        >
          <div className="space-y-3">
            <p className={submitResult.success ? "text-green-800" : "text-red-800"}>
              {submitResult.message}
            </p>
          </div>
        </StandardCard>
      )}
    </div>
  )
}
