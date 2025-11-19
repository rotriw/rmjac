"use client"
import { useState, useEffect, useMemo } from "react"
import { useSearchParams } from "next/navigation"
import { TitleCard } from "@/components/card/card"
import { FormQuery, FormField } from "@/components/tools/query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StandardCard } from "@/components/card/card";
import { Plus, Trash2 } from "lucide-react";
import { ProblemModule, SampleGroup, ProblemData } from "./types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {createProblem} from "@/lib/api_client";

interface DetailDataProps {
  values?: Record<string, string | ProblemData[]>;
  onChange?: (values: Record<string, string | ProblemData[]>) => void;
}

// Helper function to generate unique IDs for problems
const generateProblemId = () => `problem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function DetailData({ values = {}, onChange }: DetailDataProps) {
  const initialProblems = values.problems as ProblemData[] || [];
  const [problems, setProblems] = useState<ProblemData[]>(initialProblems.length > 0 ? initialProblems : (() => {
    // Create default problem if no problems exist
    const baseTime = Date.now();
    const defaultProblem: ProblemData = {
      id: generateProblemId(),
      problem_source: "",
      problem_iden: "",
      modules: [
        {
          id: `module_${baseTime}_0`,
          title: "题目背景",
          content: "",
          type: "background"
        },
        {
          id: `module_${baseTime}_1`,
          title: "题面描述",
          content: "",
          type: "description"
        },
        {
          id: `module_${baseTime}_2`,
          title: "输入格式",
          content: "",
          type: "input"
        },
        {
          id: `module_${baseTime}_3`,
          title: "输出格式",
          content: "",
          type: "output"
        }
      ],
      sampleGroups: []
    };
    return [defaultProblem];
  })());
  const [activeProblemId, setActiveProblemId] = useState<string>(problems[0]?.id || "");

  // Sync with external values
  useEffect(() => {
    if (values.problems && values.problems.length > 0) {
      setProblems(values.problems);
      setActiveProblemId(values.problems[0].id);
    }
  }, [values.problems]);
  const [hoveredItem, setHoveredItem] = useState<{
    type: "problem" | "module" | "sample" | null;
    id: string | null;
  }>({
    type: null,
    id: null
  });

  const addProblem = (e?: React.MouseEvent) => {
    e?.preventDefault();
    const baseTime = Date.now();
    const newProblem: ProblemData = {
      id: generateProblemId(),
      problem_source: "",
      problem_iden: "",
      modules: [
        {
          id: `module_${baseTime}_0`,
          title: "题目背景",
          content: "",
          type: "background"
        },
        {
          id: `module_${baseTime}_1`,
          title: "题面描述",
          content: "",
          type: "description"
        },
        {
          id: `module_${baseTime}_2`,
          title: "输入格式",
          content: "",
          type: "input"
        },
        {
          id: `module_${baseTime}_3`,
          title: "输出格式",
          content: "",
          type: "output"
        }
      ],
      sampleGroups: []
    };
    const updatedProblems = [...problems, newProblem];
    setProblems(updatedProblems);
    setActiveProblemId(newProblem.id);
    onChange?.({ ...values, problems: updatedProblems });
  };

  const deleteProblem = (problemId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    const updatedProblems = problems.filter(p => p.id !== problemId);
    setProblems(updatedProblems);

    // Set active problem to the first remaining problem or empty if no problems left
    if (updatedProblems.length > 0) {
      setActiveProblemId(updatedProblems[0].id);
    } else {
      setActiveProblemId("");
    }

    onChange?.({ ...values, problems: updatedProblems });
  };

  const updateProblem = (problemId: string, updates: Partial<ProblemData>) => {
    const updatedProblems = problems.map(p =>
      p.id === problemId ? { ...p, ...updates } : p
    );
    setProblems(updatedProblems);
    onChange?.({ ...values, problems: updatedProblems });
  };

  const addModule = (problemId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    const newModule: ProblemModule = {
      id: `module_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      title: "新模块",
      content: "",
      type: "custom"
    };

    updateProblem(problemId, {
      modules: [...problem.modules, newModule]
    });
  };

  const deleteModule = (problemId: string, moduleId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    updateProblem(problemId, {
      modules: problem.modules.filter(m => m.id !== moduleId)
    });
  };

  const updateModule = (problemId: string, moduleId: string, updates: Partial<ProblemModule>) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    updateProblem(problemId, {
      modules: problem.modules.map(m =>
        m.id === moduleId ? { ...m, ...updates } : m
      )
    });
  };

  const addSampleGroup = (problemId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    const newSampleGroup: SampleGroup = {
      id: `sample_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      input: "",
      output: "",
      explanation: ""
    };

    updateProblem(problemId, {
      sampleGroups: [...problem.sampleGroups, newSampleGroup]
    });
  };

  const deleteSampleGroup = (problemId: string, sampleId: string, e?: React.MouseEvent) => {
    e?.preventDefault();
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    updateProblem(problemId, {
      sampleGroups: problem.sampleGroups.filter(s => s.id !== sampleId)
    });
  };

  const updateSampleGroup = (problemId: string, sampleId: string, updates: Partial<SampleGroup>) => {
    const problem = problems.find(p => p.id === problemId);
    if (!problem) return;

    updateProblem(problemId, {
      sampleGroups: problem.sampleGroups.map(s =>
        s.id === sampleId ? { ...s, ...updates } : s
      )
    });
  };

  
  return (
    <div className="space-y-6">
      {problems.length > 0 && (
        <div className="flex justify-between items-center">
          <Tabs value={activeProblemId} onValueChange={setActiveProblemId}>
            <TabsList>
              {problems.map((problem) => (
                <TabsTrigger key={problem.id} value={problem.id}>
                  {problem.problem_source || '[未知]'}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <Button onClick={addProblem} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            添加题面
          </Button>
        </div>
      )}

      {problems.length > 0 && (
        <Tabs value={activeProblemId} onValueChange={setActiveProblemId}>
          {problems.map((problem) => (
            <TabsContent key={problem.id} value={problem.id}>
              <StandardCard
                title={`题面`}
                className={hoveredItem.type === "problem" && hoveredItem.id === problem.id ? "bg-blue-50 border-blue-200 transition-all duration-300 mb-2 shadow-none rounded-sm p-0" : "mb-2 shadow-none rounded-sm p-0"}
              >
                <div className="space-y-4">
                  {/* Problem Basic Info */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>题目来源</Label>
                      <Input
                        value={problem.problem_source}
                        onChange={(e) => updateProblem(problem.id, { problem_source: e.target.value })}
                        placeholder="如：CF、ATCoder、洛谷等"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>题目标识</Label>
                      <Input
                        value={problem.problem_iden}
                        onChange={(e) => updateProblem(problem.id, { problem_iden: e.target.value })}
                        placeholder="如：CF1234A、ABC123A等"
                      />
                    </div>
                  </div>

                  {/* Modules */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Button onClick={(e) => addModule(problem.id, e)} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        添加模块
                      </Button>
                    </div>

                    {problem.modules.map((module) => (
                      <div
                        key={module.id}
                        className={`space-y-2 p-3 border rounded-lg transition-all duration-300 ${
                          hoveredItem.type === "module" && hoveredItem.id === module.id
                            ? "bg-blue-50 border-blue-200"
                            : "border-gray-200"
                        }`}
                      >
                        <div className="flex justify-between items-center">
                          <Input
                            value={module.title}
                            onChange={(e) => updateModule(problem.id, module.id, { title: e.target.value })}
                            className="font-medium"
                            placeholder="模块标题"
                          />
                          <Button
                            onClick={(e) => deleteModule(problem.id, module.id, e)}
                            onMouseEnter={() => setHoveredItem({ type: "module", id: module.id })}
                            onMouseLeave={() => setHoveredItem({ type: null, id: null })}
                            size="sm"
                            variant="ghost"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                        <textarea
                          value={module.content}
                          onChange={(e) => updateModule(problem.id, module.id, { content: e.target.value })}
                          className="w-full min-h-[100px] p-2 border rounded-md resize-y"
                          placeholder="模块内容..."
                        />
                      </div>
                    ))}
                  </div>

                  {/* Sample Groups */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Button onClick={(e) => addSampleGroup(problem.id, e)} size="sm" variant="outline">
                        <Plus className="w-4 h-4 mr-1" />
                        添加样例组
                      </Button>
                    </div>

                    {problem.sampleGroups.map((sample) => (
                      <div
                        key={sample.id}
                        className={`space-y-2 p-3 border rounded-lg transition-all duration-300 ${
                          hoveredItem.type === "sample" && hoveredItem.id === sample.id
                            ? "bg-blue-50 border-blue-200"
                            : "border-gray-200"
                        }`}
                      >

                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-2">
                            <Label>输入样例</Label>
                            <textarea
                              value={sample.input}
                              onChange={(e) => updateSampleGroup(problem.id, sample.id, { input: e.target.value })}
                              className="w-full min-h-[80px] p-2 border rounded-md resize-y font-mono text-sm"
                              placeholder="输入样例..."
                            />
                          </div>
                          <div className="space-y-2">
                            <Label>输出样例</Label>
                            <textarea
                              value={sample.output}
                              onChange={(e) => updateSampleGroup(problem.id, sample.id, { output: e.target.value })}
                              className="w-full min-h-[80px] p-2 border rounded-md resize-y font-mono text-sm"
                              placeholder="输出样例..."
                            />
                          </div>
                        </div>
                        <div className="space-y-2">
                          <Label>样例说明（可选）</Label>
                          <textarea
                            value={sample.explanation || ""}
                            onChange={(e) => updateSampleGroup(problem.id, sample.id, { explanation: e.target.value })}
                            className="w-full min-h-[60px] p-2 border rounded-md resize-y text-sm"
                            placeholder="样例说明..."
                          />
                        </div>

                        <div className="flex justify-between items-center">
                          <span className="font-medium"></span>
                          <Button
                            onClick={(e) => deleteSampleGroup(problem.id, sample.id, e)}
                            onMouseEnter={() => setHoveredItem({ type: "sample", id: sample.id })}
                            onMouseLeave={() => setHoveredItem({ type: null, id: null })}
                            size="sm"
                            variant="ghost"
                          >
                            删除<Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Delete Problem Button */}
                  <div className="flex justify-end">
                    <Button
                      onClick={(e) => deleteProblem(problem.id, e)}
                      onMouseEnter={() => setHoveredItem({ type: "problem", id: problem.id })}
                      onMouseLeave={() => setHoveredItem({ type: null, id: null })}
                      variant="destructive"
                      size="sm"
                    >
                      <Trash2 className="w-4 h-4 mr-2" />
                      删除此题面
                    </Button>
                  </div>
                </div>
              </StandardCard>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}

export function ProblemTool() {
  const searchParams = useSearchParams()
  const [formValues, setFormValues] = useState<Record<string, string | ProblemData[]>>({})
  const [problems, setProblems] = useState<ProblemData[]>([]);
  const [submitResult, setSubmitResult] = useState<{ success: boolean; message: string; data?: any } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Handle form submission
  const handleSubmit = async (e?: React.MouseEvent) => {
    e?.preventDefault();
    setIsSubmitting(true);
    setSubmitResult(null);

    // Transform the data to match backend API structure
    const problemStatements: Array<{
      statement_source: string;
      iden?: string;
      problem_statements: Array<{ iden: string; content: string }>;
      time_limit: number;
      memory_limit: number;
      sample_groups?: Array<[string, string]>
    }> = problems.map(problem => ({
      statement_source: problem.problem_source,
      iden: problem.problem_iden || undefined,
      problem_statements: problem.modules.map(module => ({
        iden: module.type,
        content: module.content
      })),
      time_limit: 1000, // default time limit in ms
      memory_limit: 256,  // default memory limit in MB
      show_order: ["default"],
      sample_group: problem.sampleGroups.length > 0 ? problem.sampleGroups.map(sample => [sample.input, sample.output]) : undefined
    }));
    //get from cookie.
    const user_id = +document.cookie.split('; ').find(row => row.startsWith('_uid='))?.split('=')[1] || '';
    const submissionData = {
      user_id,
      problem_iden: formValues.iden as string || problems[0]?.problem_iden || "",
      problem_name: formValues.name as string || "未命名题目",
      problem_statement: problemStatements,
      tags: formValues.tags as string[] || []
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

  // Create a stable component reference that captures current problems
  const DetailDataComponent = useMemo(() => {
    const WrappedComponent = (props: { values: Record<string, string | ProblemData[]>; onChange?: (values: Record<string, string | ProblemData[]>) => void }) => {
      const { values: externalValues, onChange: externalOnChange } = props;
      return <DetailData
        values={externalValues}
        onChange={(newValues) => {
          externalOnChange?.(newValues);
          // Update problems in parent component
          if (newValues.problems) {
            setProblems(newValues.problems as ProblemData[]);
          }
        }}
      />;
    };
    WrappedComponent.displayName = 'DetailDataWrapper';
    return WrappedComponent;
  }, []);

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
        children: DetailDataComponent
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
