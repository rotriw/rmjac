"use client"
import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { TitleCard } from "@/components/card/card"
import { FormQuery, FormField } from "@/components/tools/query";
import { StandardCard } from "@/components/card/card";
import { createTraining } from "@/lib/api_client";

export function TrainingCreateTool() {
  const searchParams = useSearchParams()
  const [formValues, setFormValues] = useState<Record<string, any>>({
    mode: "simple",
    training_type: "Default",
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  })
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const problem_list = {
        description: "Default List",
        own_problem: [] as any[]
      };

      if (formValues.mode === "simple" && formValues.problems) {
        const problemIds = (formValues.problems as string).split(",").map(id => id.trim()).filter(id => id);
        problem_list.own_problem = problemIds.map(id => ({ ProblemIden: id }));
      }

      const submissionData = {
        iden: formValues.iden || "",
        title: formValues.title || "未命名题单",
        description_public: formValues.description_public || "",
        description_private: formValues.description_private || "",
        start_time: formValues.start_time ? formValues.start_time + ":00" : "",
        end_time: formValues.end_time ? formValues.end_time + ":00" : "",
        training_type: formValues.training_type || "Default",
        problem_list: problem_list,
        write_perm_user: [],
        read_perm_user: []
      };

      const result = await createTraining(submissionData);

      if (result.data) {
        setSubmitResult({
          success: true,
          message: `题单创建成功！`,
          data: result
        });
      } else {
        setSubmitResult({
          success: false,
          message: `创建失败: ${result.message || '未知错误'}`,
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

  const fields: FormField[] = [
    {
      type: "group",
      title: "创建模式",
      children: [{
        type: "select",
        name: "mode",
        title: "选择模式",
        options: [
          { label: "简单模式 (快速导入题目)", value: "simple" },
          { label: "复杂模式 (后续编辑题目)", value: "complex" },
          { label: "导入模式 (从外部网站导入)", value: "import" }
        ]
      }]
    },
    {
      type: "group",
      title: "基本信息",
      children: [
        {
          type: "input",
          name: "title",
          title: "题单标题"
        },
        {
          type: "input",
          name: "iden",
          title: "题单标识 (iden)"
        },
        {
          type: "input",
          name: "description_public",
          title: "公开描述"
        }
      ]
    },
    ...(formValues.mode === "simple" ? [{
      type: "group" as const,
      title: "题目导入",
      children: [{
        type: "input" as const,
        name: "problems",
        title: "题目 ID (逗号分隔)"
      }]
    }] : []),
    ...(formValues.mode === "import" ? [{
      type: "group" as const,
      title: "外部导入",
      children: [{
        type: "input" as const,
        name: "import_url",
        title: "外部链接"
      }, {
        type: "button" as const,
        title: "开始导入 (API 待实现)",
        onClick: () => alert("API 待实现")
      }]
    }] : []),
    {
      type: "group",
      title: "时间设置",
      children: [
        {
          type: "input",
          name: "start_time",
          title: "开始时间"
        },
        {
          type: "input",
          name: "end_time",
          title: "结束时间"
        }
      ]
    },
    {
      type: "group",
      title: "提交",
      children: [{
        type: "button",
        title: isSubmitting ? "提交中..." : "创建题单",
        onClick: handleSubmit,
      }]
    }
  ];

  useEffect(() => {
    const initialValues: Record<string, any> = { ...formValues }
    searchParams.forEach((value, key) => {
      initialValues[key] = value
    })
    setFormValues(initialValues)
  }, [searchParams])

  const handleFormChange = (values: Record<string, any>) => {
    setFormValues(values)
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <TitleCard title="创建题单" description="Create a new training session" />
      <FormQuery
        fields={fields}
        values={formValues}
        onChange={handleFormChange}
      />

      {submitResult && (
        <StandardCard
          title={submitResult.success ? "提交成功" : "提交失败"}
          className={submitResult.success ? "mt-6 border-green-200 bg-green-50" : "mt-6 border-red-200 bg-red-50"}
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