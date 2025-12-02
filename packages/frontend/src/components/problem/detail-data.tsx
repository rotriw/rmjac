"use client"

import { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { StandardCard } from "@/components/card/card"
import { Plus, Trash2 } from "lucide-react"
import { ProblemModule, SampleGroup, ProblemData } from "@/app/problem/create/types"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"

interface DetailDataProps {
  values?: Record<string, string | ProblemData[]>;
  onChange?: (values: Record<string, string | ProblemData[]>) => void;
  mode?: "create" | "edit";
  problemId?: string;
}

// Helper function to generate unique IDs for problems
const generateProblemId = () => `problem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function DetailData({ values = {}, onChange, mode = "create", problemId }: DetailDataProps) {
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
      setProblems(values.problems as ProblemData[]);
      setActiveProblemId((values.problems as ProblemData[])[0].id);
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

    // Set active problem to first remaining problem or empty if no problems left
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
          {mode === "create" && (
              <Button onClick={addProblem} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              添加题面
            </Button>
          )}
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
                      <Button onClick={(e: React.MouseEvent) => addModule(problem.id, e)} size="sm" variant="outline">
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
                            onClick={(e: React.MouseEvent) => deleteModule(problem.id, module.id, e)}
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
                      <Button onClick={(e: React.MouseEvent) => addSampleGroup(problem.id, e)} size="sm" variant="outline">
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
                            onClick={(e: React.MouseEvent) => deleteSampleGroup(problem.id, sample.id, e)}
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
                  {mode === "create" && (
                    <div className="flex justify-end">
                      <Button
                        onClick={(e: React.MouseEvent) => deleteProblem(problem.id, e)}
                        onMouseEnter={() => setHoveredItem({ type: "problem", id: problem.id })}
                        onMouseLeave={() => setHoveredItem({ type: null, id: null })}
                        variant="destructive"
                        size="sm"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        删除此题面
                      </Button>
                    </div>
                  )}
                </div>
              </StandardCard>
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}