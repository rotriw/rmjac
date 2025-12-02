"use client"

import { useState, useEffect } from "react"
import { TitleCard } from "@/components/card/card"
import { Button } from "@/components/ui/button"
import { StandardCard } from "@/components/card/card"
import { Save } from "lucide-react"
import { ProblemModule, SampleGroup, ProblemData } from "../../create/types"
import { getProblemForEdit, updateProblemStatement, updateProblemSource } from "@/lib/api_client"
import { DetailData } from "@/components/problem/detail-data"

interface EditPageProps {
  params: Promise<{ id: string }>
}

export default function EditPage({ params }: EditPageProps) {
  const [problemId, setProblemId] = useState<string>("");
  const [formValues, setFormValues] = useState<Record<string, string | ProblemData[]>>({})
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadParams = async () => {
      const { id } = await params;
      setProblemId(id);
    };
    
    loadParams();
  }, [params]);

  useEffect(() => {
    if (!problemId) return;
    
    const loadProblemData = async () => {
      try {
        setIsLoading(true);
        const data = await getProblemForEdit(problemId);
        
        if (data && data.model) {
          const problemStatements = data.model.problem_statement_node || [];
          
          const transformedProblems: ProblemData[] = problemStatements.map(([statement, limit]: [any, any], index: number) => {
            const modules: ProblemModule[] = statement.public.statements.map((s: any) => ({
              id: `module_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 6)}`,
              title: getTitleFromType(s.iden),
              content: s.content,
              type: s.iden as any
            }));
            
            const sampleGroups: SampleGroup[] = statement.public.sample_group ? 
              statement.public.sample_group.map((sample: any[], i: number) => ({
                id: `sample_${Date.now()}_${index}_${i}`,
                input: sample[0] || "",
                output: sample[1] || "",
                explanation: ""
              })) : [];
            
            return {
              id: `problem_${Date.now()}_${index}`,
              problem_source: statement.public.source || "",
              problem_iden: statement.public.iden || "",
              modules,
              sampleGroups
            };
          });
          
          setFormValues({ problems: transformedProblems });
        }
      } catch (error) {
        console.error("Failed to load problem data:", error);
        setSubmitResult({
          success: false,
          message: `加载题目失败: ${error instanceof Error ? error.message : '未知错误'}`,
        });
      } finally {
        setIsLoading(false);
      }
    };
    
    loadProblemData();
  }, [problemId]);

  const getTitleFromType = (type: string): string => {
    const titleMap: { [key: string]: string } = {
      "background": "题目背景",
      "description": "题目描述",
      "input": "输入格式",
      "output": "输出格式",
      "sample_input": "样例输入",
      "sample_output": "样例输出",
      "hint": "提示",
      "source": "来源",
    };
    return titleMap[type] || type;
  };

  const handleSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    try {
      const problems = formValues.problems as ProblemData[] || [];
      
      for (const problem of problems) {
        const problemStatements = problem.modules.map(module => ({
          iden: module.type,
          content: module.content
        }));
        
        await updateProblemStatement(problemId, problemStatements);
        
        if (problem.problem_source) {
          await updateProblemSource(problemId, problem.problem_source);
        }
      }

      setSubmitResult({
        success: true,
        message: "题目更新成功！",
      });
    } catch (error) {
      setSubmitResult({
        success: false,
        message: `更新失败: ${error instanceof Error ? error.message : '未知错误'}`,
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFormChange = (values: Record<string, string | ProblemData[]>) => {
    setFormValues(values)
  }

  if (isLoading) {
    return (
      <div className="container mx-auto py-6 px-4 md:px-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-lg">加载中...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-6 px-4 md:px-6">
      <div className="flex justify-between items-center mb-6">
        <TitleCard 
          title="编辑题目" 
          description={`ID: ${problemId}`}
        />
        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting || !formValues.problems || (formValues.problems as ProblemData[]).length === 0}
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? "保存中..." : "保存更改"}
          </Button>
        </div>
      </div>

      <DetailData 
        values={formValues}
        onChange={handleFormChange}
        mode="edit"
        problemId={problemId}
      />

      {submitResult && (
        <StandardCard
          title={submitResult.success ? "保存成功" : "保存失败"}
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
  );
}