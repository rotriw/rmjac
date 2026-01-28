"use client"

import { useState, useEffect } from "react"
import { ProblemData } from "@/app/problem/create/types"
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { IntegratedTypstEditor } from "@/components/editor/integrated-typst-editor"
interface DetailDataProps {
  values?: Record<string, string | ProblemData[]>;
  onChange?: (values: Record<string, string | ProblemData[]>) => void;
  mode?: "create" | "edit";
}

// Helper function to generate unique IDs for problems
const generateProblemId = () => `problem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

export function DetailData({ values = {}, onChange, mode = "create" }: DetailDataProps) {
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
              {/* 整合编辑器 */}
              <IntegratedTypstEditor
                problemData={problem}
                onChange={(updatedProblem) => {
                  const updatedProblems = problems.map(p =>
                    p.id === problem.id ? updatedProblem : p
                  );
                  setProblems(updatedProblems);
                  onChange?.({ ...values, problems: updatedProblems });
                }}
              />
            </TabsContent>
          ))}
        </Tabs>
      )}
    </div>
  );
}