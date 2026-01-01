"use client"

import { useState, useEffect, useCallback } from "react"
import { TitleCard } from "@/components/card/card"
import { FormQuery } from "@/components/tools/query"
import { StandardCard } from "@/components/card/card"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ManageRightSidebar, ManageMode } from "./rightbar"
import {
  getTrainingByIden,
  addProblemToTrainingList,
  addProblemListToTraining,
  modifyTrainingListDescription,
  removeProblemFromTraining,
  updateTrainingOrder,
  type TrainingProblem,
  type TrainingList
} from "@/lib/api_client"
import { TreeTable, TreeTableNode } from "@/components/table/treetable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, ArrowUp, ArrowDown, Plus, FolderPlus } from "lucide-react"

interface TrainingData {
  training_node: {
    public: {
      name: string
      iden: string
      description: string
    }
    private: {
      description: string
    }
  }
  problem_list: TrainingList
}

interface TrainingManageToolProps {
  user_iden: string
  training_iden: string
}

export function TrainingManageTool({ user_iden, training_iden }: TrainingManageToolProps) {
  const [mode, setMode] = useState<ManageMode>("info")
  const [trainingData, setTrainingData] = useState<TrainingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [formValues, setFormValues] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    try {
      const data = (await getTrainingByIden(user_iden, training_iden)).data;
      setTrainingData(data)
      setFormValues({
        title: data.training_node.public.name,
        iden: data.training_node.public.iden,
        description_public: data.training_node.public.description,
        description_private: data.training_node.private.description,
      })
    } catch (error) {
      console.error("Failed to fetch training data:", error)
    } finally {
      setLoading(false)
    }
  }, [user_iden, training_iden])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const handleInfoSubmit = async () => {
    // TODO: Implement info update API if available
    alert("信息更新功能待实现")
  }

  const handleAddProblem = async (list_node_id: number, problemsStr: string) => {
    const problems = problemsStr.split(",").map(p => p.trim()).filter(p => p)
    try {
      const res = await addProblemToTrainingList(user_iden, training_iden, {
        list_node_id,
        problems
      })
      alert(res.message || "添加成功")
      fetchData()
    } catch {
      alert("添加失败")
    }
  }

  const handleAddTrainingProblem = async (
    list_node_id: number,
    type: "ProblemTraining" | "ProblemPresetTraining" | "ExistTraining",
    data: { description?: string; node_id?: string; iden?: string }
  ) => {
    try {
      let own_problem: TrainingProblem;
      if (type === "ProblemTraining") {
        own_problem = { ProblemTraining: { description: data.description || "", own_problem: [], node_id: 0 } };
      } else if (type === "ProblemPresetTraining") {
        own_problem = { ProblemPresetTraining: [parseInt(data.node_id || "0"), data.iden || ""] };
      } else {
        own_problem = { ExistTraining: [parseInt(data.node_id || "0"), data.iden || ""] };
      }

      const res = await addProblemListToTraining(user_iden, training_iden, {
        list_node_id,
        problem_list: {
          description: data.description || "New Item",
          own_problem: [own_problem]
        }
      })
      alert(res.message || "操作成功")
      fetchData()
    } catch {
      alert("操作失败")
    }
  }

  const handleRemoveProblem = async (list_node_id: number, delete_node_id: number) => {
    if (!confirm("确定要删除吗？")) return
    try {
      const res = await removeProblemFromTraining(user_iden, training_iden, {
        list_node_id,
        delete_node_id
      })
      alert(res.message || "删除成功")
      fetchData()
    } catch {
      alert("删除失败")
    }
  }

  const handleMove = async (list_node_id: number, currentIndex: number, direction: 'up' | 'down', own_problem: TrainingProblem[]) => {
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= own_problem.length) return

    const newProblems = [...own_problem]
    const temp = newProblems[currentIndex]
    newProblems[currentIndex] = newProblems[newIndex]
    newProblems[newIndex] = temp

    const orders: [number, number][] = newProblems.map((p, idx) => {
      let nodeId = 0
      if (p.ProblemIden) nodeId = p.ProblemIden[0]
      else if (p.ProblemTraining) nodeId = p.ProblemTraining.node_id
      else if (p.ProblemPresetTraining) nodeId = p.ProblemPresetTraining[0]
      else if (p.ExistTraining) nodeId = p.ExistTraining[0]
      return [nodeId, idx]
    })

    try {
      await updateTrainingOrder(user_iden, training_iden, {
        list_node_id,
        orders
      })
      fetchData()
    } catch {
      alert("排序失败")
    }
  }

  const handleUpdateDescription = async (list_node_id: number) => {
    const newDesc = prompt("请输入新的描述")
    if (newDesc === null) return
    try {
      await modifyTrainingListDescription(user_iden, training_iden, {
        list_node_id,
        description_public: newDesc,
        description_private: ""
      })
      fetchData()
    } catch {
      alert("修改失败")
    }
  }

  const renderInfoMode = () => (
    <div className="space-y-6">
      <FormQuery
        fields={[
          {
            type: "group",
            title: "基本信息",
            children: [
              { type: "input", name: "title", title: "题单标题" },
              { type: "input", name: "iden", title: "题单标识 (iden)" },
              { type: "input", name: "description_public", title: "公开描述" },
              { type: "input", name: "description_private", title: "私有描述" },
            ]
          },
          {
            type: "group",
            title: "操作",
            children: [
              { type: "button", title: "保存修改", onClick: handleInfoSubmit }
            ]
          }
        ]}
        values={formValues}
        onChange={(vals: unknown) => setFormValues(vals as Record<string, string>)}
      />
    </div>
  )

  const renderProblemsMode = () => {
    if (!trainingData) return null

    const transformToTreeNodes = (list: TrainingList, parentListNodeId: number): TreeTableNode[] => {
      return list.own_problem.map((p: TrainingProblem, index: number) => {
        const isSubTraining = !!p.ProblemTraining
        let nodeId = 0
        if (p.ProblemIden) nodeId = p.ProblemIden[0]
        else if (p.ProblemTraining) nodeId = p.ProblemTraining.node_id
        else if (p.ProblemPresetTraining) nodeId = p.ProblemPresetTraining[0]
        else if (p.ExistTraining) nodeId = p.ExistTraining[0]

        const id = `node-${nodeId}-${index}`
        
        let content_title = ""
        let content: React.ReactNode = null
        let children: TreeTableNode[] = []

        if (p.ProblemIden) {
          const problemIden = p.ProblemIden
          content_title = "题目"
          content = (
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">{problemIden[1]}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'up', list.own_problem) }} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'down', list.own_problem) }} disabled={index === list.own_problem.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleRemoveProblem(parentListNodeId, nodeId) }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )
        } else if (p.ProblemTraining) {
          const subTraining = p.ProblemTraining
          content_title = "子模块"
          content = (
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">{subTraining.description}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); handleUpdateDescription(nodeId) }}>编辑描述</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'up', list.own_problem) }} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'down', list.own_problem) }} disabled={index === list.own_problem.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleRemoveProblem(parentListNodeId, nodeId) }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )
          children = transformToTreeNodes(subTraining, nodeId)
        } else if (p.ProblemPresetTraining) {
          const preset = p.ProblemPresetTraining
          content_title = "预设"
          content = (
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">{preset[1]} (ID: {preset[0]})</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'up', list.own_problem) }} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'down', list.own_problem) }} disabled={index === list.own_problem.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleRemoveProblem(parentListNodeId, nodeId) }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )
        } else if (p.ExistTraining) {
          const exist = p.ExistTraining
          content_title = "引用"
          content = (
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">{exist[1]} (ID: {exist[0]})</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'up', list.own_problem) }} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'down', list.own_problem) }} disabled={index === list.own_problem.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleRemoveProblem(parentListNodeId, nodeId) }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )
        }

        return {
          id,
          content_title,
          content,
          children,
          background: isSubTraining ? "#f3f4f6" : undefined,
          defaultExpanded: true
        }
      })
    }

    const treeData = transformToTreeNodes(trainingData.problem_list, trainingData.problem_list.node_id)

    const renderAddTools = (listNodeId: number) => (
      <div className="mt-4 p-4 border rounded-lg bg-muted/30 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> 快速添加题目</p>
            <div className="flex gap-2">
              <Input
                id={`add-p-${listNodeId}`}
                placeholder="P1000, P1001"
                className="h-9"
              />
              <Button
                size="sm"
                onClick={() => {
                  const input = document.getElementById(`add-p-${listNodeId}`) as HTMLInputElement
                  handleAddProblem(listNodeId, input.value)
                }}
              >
                添加
              </Button>
            </div>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium flex items-center gap-2"><FolderPlus className="h-4 w-4" /> 创建子模块 / 引用</p>
            <div className="flex gap-2">
              <Input
                id={`add-l-${listNodeId}`}
                placeholder="名称 或 ID,标识"
                className="h-9"
              />
              <select
                id={`type-l-${listNodeId}`}
                title="类型"
                className="h-9 rounded-md border border-input bg-background px-2 py-1 text-sm"
              >
                <option value="ProblemTraining">子模块</option>
                <option value="ProblemPresetTraining">预设</option>
                <option value="ExistTraining">引用</option>
              </select>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {
                  const input = document.getElementById(`add-l-${listNodeId}`) as HTMLInputElement
                  const type = (document.getElementById(`type-l-${listNodeId}`) as HTMLSelectElement).value as "ProblemTraining" | "ProblemPresetTraining" | "ExistTraining"
                  if (type === "ProblemTraining") {
                    handleAddTrainingProblem(listNodeId, type, { description: input.value })
                  } else {
                    const [node_id, iden] = input.value.split(",")
                    handleAddTrainingProblem(listNodeId, type, { node_id, iden, description: iden })
                  }
                }}
              >
                执行
              </Button>
            </div>
          </div>
        </div>
      </div>
    )

    return (
      <div className="space-y-6">
        <StandardCard title="题目列表管理">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              当前根列表: <span className="font-mono">{trainingData.problem_list.description}</span> (ID: {trainingData.problem_list.node_id})
            </div>
          </div>
          <TreeTable data={treeData} />
          {renderAddTools(trainingData.problem_list.node_id)}
        </StandardCard>
      </div>
    )
  }

  const renderPermissionsMode = () => (
    <div className="space-y-6">
      <StandardCard title="权限编辑">
        <p className="text-sm text-muted-foreground">权限编辑功能正在开发中...</p>
      </StandardCard>
    </div>
  )

  if (loading) return <div className="p-8">加载中...</div>

  return (
    <SidebarProvider>
      <div className="flex w-full">
        <SidebarInset className="flex-1">
          <div className="container mx-auto py-6 px-4 md:px-6">
            <TitleCard 
              title={`管理题单: ${trainingData?.training_node.public.name}`} 
              description={`Mode: ${mode}`} 
            />
            
            <div className="mt-6">
              {mode === "info" && renderInfoMode()}
              {mode === "problems" && renderProblemsMode()}
              {mode === "permissions" && renderPermissionsMode()}
            </div>
          </div>
        </SidebarInset>
        <ManageRightSidebar mode={mode} setMode={setMode} />
      </div>
    </SidebarProvider>
  )
}