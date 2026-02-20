"use client"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { useSearchParams } from "next/navigation"
import { TitleCard } from "@/components/card/card"
import { FormQuery, FormField } from "@/components/tools/query";
import { StandardCard } from "@/components/card/card";
import { postCreate as createTraining } from "@/api/client/api_training_create";
import { TrainingNode, TrainingList, TrainingProblem, CreateTrainingReq } from "@rmjac/api-declare";
import { TrainingCreateRightSidebar } from "./training-create-right-sidebar";
import { TypstEditor } from "@/components/editor/typst-editor";
import { TypstRenderer } from "@/components/editor/typst-renderer";
import { Button } from "@/components/ui/button"

// Define a type for the form values
interface TrainingFormValues {
  mode: "simple" | "complex" | "import";
  training_type: string;
  start_time: string;
  end_time: string;
  iden: string;
  title: string;
  description_public: string;
  description_private: string;
  problems?: string; // Comma-separated problem IDs for simple mode
  import_url?: string; // URL for import mode
  [key: string]: string | undefined;
}

export function TrainingCreateTool() {
  const searchParams = useSearchParams()
  const [formValues, setFormValues] = useState<TrainingFormValues>({
    mode: "simple",
    training_type: "Default",
    start_time: new Date().toISOString().slice(0, 16),
    end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
    iden: "",
    title: "",
    description_public: "",
    description_private: "",
  })
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; data?: TrainingNode | unknown } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [viewMode, setViewMode] = useState<"form" | "preview">("form");

  const handleSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const problem_list: TrainingList = {
        node_id: 0,
        description: "Default List",
        own_problem: [] as TrainingProblem[]
      };

      if (formValues.mode === "simple" && formValues.problems) {
        const problemIds = formValues.problems.split(",").map(id => id.trim()).filter(id => id);
        problem_list.own_problem = problemIds.map(id => ({
          ProblemIden: [0, id, 0] as [number, string, number]
        }));
      }

      const submissionData: CreateTrainingReq = {
        iden: formValues.iden || "",
        title: formValues.title || "未命名训练",
        description_public: formValues.description_public || "",
        description_private: formValues.description_private || "",
        start_time: formValues.start_time ? formValues.start_time + ":00" : "",
        end_time: formValues.end_time ? formValues.end_time + ":00" : "",
        training_type: formValues.training_type || "Default",
        problem_list: problem_list,
        write_perm_user: [],
        read_perm_user: []
      };

      const result = await createTraining({ data: submissionData });

      if (result) {
        setSubmitResult({
          success: true,
          message: `训练创建成功！`,
          data: result.data
        });
      } else {
        setSubmitResult({
          success: false,
          message: `创建失败: 未知错误`,
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
      title: "基本信息",
      children: [
        {
          type: "input",
          name: "title",
          title: "训练标题"
        },
        {
          type: "input",
          name: "iden",
          title: "训练标识 (iden)"
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
        onClick: () => toast.info("API 待实现")
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
    }
  ];

  useEffect(() => {
    const initialValues: TrainingFormValues = {
        mode: "simple",
        training_type: "Default",
        start_time: new Date().toISOString().slice(0, 16),
        end_time: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
        iden: "",
        title: "",
        description_public: "",
        description_private: "",
    }
    if (searchParams) {
      searchParams.forEach((value, key) => {
        initialValues[key] = value
      })
    }
    setFormValues(initialValues)
  }, [searchParams])

  const handleFormChange = (values: Record<string, string | string[]>) => {
    setFormValues(prev => ({
      ...prev,
      ...Object.fromEntries(
        Object.entries(values).map(([k, v]) => [k, Array.isArray(v) ? v.join(',') : v])
      )
    }))
  }

  const handleDescriptionChange = (value: string) => {
    setFormValues(prev => ({
      ...prev,
      description_public: value
    }))
  }

  const handleModeChange = (mode: TrainingFormValues["mode"]) => {
    setFormValues(prev => ({
      ...prev,
      mode
    }))
  }

  // Convert formValues to the format expected by FormQuery
  const formQueryValues: Record<string, string | string[]> = Object.fromEntries(
    Object.entries(formValues).filter(([, v]) => v !== undefined).map(([k, v]) => [k, v as string])
  )

  return (
    <div className="flex flex-col lg:flex-row flex-1 min-h-0">
      {/* 主内容区域 */}
      <div className="flex-1 w-full py-6 px-4 md:px-6 lg:overflow-y-auto">
        <TitleCard title="创建训练" description="Create a new training session" />
        
        <FormQuery
          fields={fields}
          values={formQueryValues}
          onChange={handleFormChange}
        />

        {/* 公开描述编辑区 - Typst 编辑器 */}
        <StandardCard title="公开描述" className="mt-6">
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              使用 Typst 语法编写训练的公开描述，右侧可预览渲染效果
            </p>
            
            {viewMode === "form" ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Typst 编辑器 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">编辑器</label>
                  <TypstEditor
                    value={formValues.description_public || ""}
                    onChange={handleDescriptionChange}
                    height="400px"
                    onRender={() => {}}
                  />
                </div>
                
                {/* 实时预览 */}
                <div className="space-y-2">
                  <label className="text-sm font-medium">实时预览</label>
                  <div 
                    className="border rounded-md p-4 bg-white min-h-[400px] overflow-auto"
                    style={{ fontSize: '14px', lineHeight: '1.6' }}
                  >
                    <TypstRenderer content={formValues.description_public || ""} />
                  </div>
                </div>
              </div>
            ) : (
              <div 
                className="border rounded-md p-6 bg-white min-h-[400px] overflow-auto"
                style={{ fontSize: '16px', lineHeight: '1.6' }}
              >
                <TypstRenderer content={formValues.description_public || ""} />
              </div>
            )}
          </div>
        </StandardCard>
        <Button onClick={handleSubmit}>创建</Button>

        {submitResult && (
          <StandardCard
            title={submitResult.success ? "提交成功" : "提交失败"}
            className={submitResult.success ? "mt-6 border-green-200 bg-green-50" : "mt-6 border-red-200 bg-red-50"}
          >
            <div className="space-y-3">
              <p className={submitResult.success ? "text-green-800" : "text-red-800"}>
                {submitResult.message}
              </p>
              {submitResult.data != null && (
                <details className="mt-3">
                  <summary className="cursor-pointer text-sm font-medium text-gray-600 hover:text-gray-800">
                    查看详细响应数据
                  </summary>
                  <pre className="mt-2 p-3 bg-gray-100 rounded-md text-xs overflow-auto max-h-60">
                    {JSON.stringify(submitResult.data, (_key, value) =>
                      typeof value === 'bigint' ? value.toString() : value
                    , 2)}
                  </pre>
                </details>
              )}
            </div>
          </StandardCard>
        )}
      </div>

      {/* 右边栏 */}
      <div className="w-full lg:w-auto">
        <TrainingCreateRightSidebar
          mode={formValues.mode}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          onModeChange={handleModeChange}
          formValues={{
            title: formValues.title,
            iden: formValues.iden,
            start_time: formValues.start_time,
            end_time: formValues.end_time,
          }}
        />
      </div>
    </div>
  )
}
