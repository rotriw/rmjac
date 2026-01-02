"use client"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { TitleCard } from "@/components/card/card"
import { FormQuery, FormField } from "@/components/tools/query";
import { StandardCard } from "@/components/card/card";
import { ProblemData } from "./types";
import {createProblem} from "@/api/client/problem";
import { DetailData } from "@/components/problem/detail-data"

export function ProblemTool() {
  const searchParams = useSearchParams()
  const [formValues, setFormValues] = useState<Record<string, string | ProblemData[]>>({})
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Handle form submission
  const handleSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);
    
    const currentProblems = (formValues.problems as ProblemData[]) || [];    
    let problemStatements: Array<{
      statement_source: string;
      iden?: string;
      problem_statements: Array<{ iden: string; content: string }>;
      time_limit: number;
      memory_limit: number;
      sample_group?: Array<[string, string]>;
      show_order: string[];
    }>;
    
    if (currentProblems.length === 0) {
      problemStatements = [{
        statement_source: "",
        iden: "default",
        problem_statements: [
          { iden: "description", content: "请在此处填写题目描述" }
        ],
        time_limit: 1000,
        memory_limit: 256,
        sample_group: [],
        show_order: ["default"]
      }];
    } else {
      problemStatements = currentProblems.map(problem => ({
        statement_source: problem.problem_source,
        iden: problem.problem_iden || undefined,
        problem_statements: problem.modules.map(module => ({
          iden: module.type,
          content: module.content
        })),
        time_limit: 1000, // default time limit in ms
        memory_limit: 256,  // default memory limit in MB
        show_order: ["default"],
        sample_group: problem.sampleGroups.length > 0 ? problem.sampleGroups.map(sample => [sample.input, sample.output]) : []
      }));
    }  
    //get from cookie.
    const user_id = +document.cookie.split('; ').find(row => row.startsWith('_uid='))?.split('=')[1] || '';
    const submissionData = {
      user_id,
      problem_iden: formValues.iden as string || currentProblems[0]?.problem_iden || "",
      problem_name: formValues.name as string || "未命名题目",
      problem_statement: problemStatements,
      tags: Array.isArray(formValues.tags) ? formValues.tags as string[] : []
    };
    
    try {
      const response = await createProblem(submissionData);

      const result = await response.json();
      
      if (response.ok) {
        setSubmitResult({
          success: true,
          message: `题目创建成功！\n题目名称: ${submissionData.problem_name}\n题目标识: ${submissionData.problem_iden}`,
          data: result
        });
      } else {
        setSubmitResult({
          success: false,
          message: `创建失败: ${result.error || '未知错误'}`,
          data: result
        });
      }
    } catch (error) {
      setSubmitResult({
        success: false,
        message: `网络错误: ${error instanceof Error ? error.message : '未知网络错误'}`,
        data: error
      });
    } finally {
      setIsSubmitting(false);
    }
  };
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
      title: "题面详情",
      children: [{
        type: "custom",
        children: DetailData
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
            console.log('Quick quote clicked:', formValues['quick-quote'])
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
  
  const handleFormChange = (values: Record<string, string | ProblemData[]>) => {
    setFormValues(values)
  }
  
  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <TitleCard title="创建题目" description="create" />
      <FormQuery
        fields={props}
        values={formValues}
        onChange={handleFormChange}
      />
      
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
            {submitResult.data && (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                  查看详细响应数据
                </summary>
                <pre className="mt-2 p-3 bg-gray-100 rounded-md text-xs overflow-auto max-h-60">
                  {JSON.stringify(submitResult.data, null, 2)}
                </pre>
              </details>
            )}
          </div>
        </StandardCard>
      )}
    </div>
  )
}
