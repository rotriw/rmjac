"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { TitleCard } from "@/components/card/card"
import { toast } from "sonner"
import { FormQuery } from "@/components/tools/query"
import { StandardCard } from "@/components/card/card"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ManageRightSidebar, ManageMode } from "./rightbar"
import { getView as getTrainingByIden } from "@/api/client/api_training_view"
import {
  postAddProblemForList,
  postAddProblemList,
  postModifyDesc,
  postRemoveProblem,
  postUpdateOrder,
} from "@/api/client/api_training_manage"
import { Training, TrainingProblem, TrainingList } from "@rmjac/api-declare";
import { TreeTable, TreeTableNode } from "@/components/table/treetable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, ArrowUp, ArrowDown, Plus, FolderPlus } from "lucide-react"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet"

interface TrainingData extends Training {}

interface TrainingManageToolProps {
  user_iden: string
  training_iden: string
}

export function TrainingManageTool({ user_iden, training_iden }: TrainingManageToolProps) {
  const [mode, setMode] = useState<ManageMode>("info")
  const [trainingData, setTrainingData] = useState<TrainingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [activeListNodeId, setActiveListNodeId] = useState<number | null>(null)

  const fetchData = useCallback(async () => {
    try {
      const response = await getTrainingByIden({ user_iden, training_iden });
      const data = response.data; // Access data property
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

  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash.replace('#', '') as ManageMode
      if (['info', 'problems', 'permissions'].includes(hash)) {
        setMode(hash)
      }
    }

    handleHashChange()
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  const handleModeChange = (newMode: ManageMode) => {
    setMode(newMode)
    window.location.hash = newMode
  }

  const handleInfoSubmit = async () => {
    // TODO: Implement info update API if available
    toast.info("信息更新功能待实现")
  }

  const handleAddProblem = async (list_node_id: number, problemsStr: string) => {
    const problems = problemsStr.split(",").map(p => p.trim()).filter(p => p)
    try {
      if (!trainingData) {
        toast.error("训练数据未加载")
        return
      }
      const res = await postAddProblemForList({ // Changed API call
        user_iden,
        training_iden,
        problems,
        lid: list_node_id,
      })
      toast.success(res.message || "添加成功") // Assuming message exists on response
      fetchData()
    } catch(err) {
      toast.error(`添加失败: ${err}`)
    }
  }

  const handleAddTrainingProblem = async (
    list_node_id: number,
    type: "ProblemTraining" | "ProblemPresetTraining" | "ExistTraining",
    data: { description?: string; node_id?: string; iden?: string }
  ) => {
    try {
      let problem_list_data: TrainingList; // Changed type to TrainingList
      if (type === "ProblemTraining") {
        problem_list_data = {
          description: data.description || "New Module",
          own_problem: []
        };
      } else if (type === "ProblemPresetTraining") {
        problem_list_data = {
          description: data.description || "Preset Training", // Added description
          own_problem: [], // Added own_problem
          ProblemPresetTraining: [parseInt(data.node_id || "0"), data.iden || ""]
        };
      } else {
        problem_list_data = {
          description: data.description || "Exist Training", // Added description
          own_problem: [], // Added own_problem
          ExistTraining: [parseInt(data.node_id || "0"), data.iden || ""]
        };
      }

      const res = await postAddProblemList({ // Changed API call
        user_iden,
        training_iden,
        lid: list_node_id,
        problem_list: problem_list_data
      })
      toast.success(res.message || "操作成功") // Assuming message exists
      fetchData()
    } catch(err) {
      toast.error(`操作失败: ${err}`)
    }
  }

  const handleRemoveProblem = async (list_node_id: number, delete_node_id: number) => {
    if (!confirm("确定要删除吗？")) return
    try {
      const res = await postRemoveProblem({ // Changed API call
        user_iden,
        training_iden,
        lid: list_node_id,
        edge_id: delete_node_id
      })
      toast.success(res.message || "删除成功") // Assuming message exists
      fetchData()
    } catch {
      toast.error("删除失败")
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
      await postUpdateOrder({ // Changed API call
        user_iden,
        training_iden,
        lid: list_node_id,
        orders
      })
      fetchData()
    } catch {
      toast.error("排序失败")
    }
  }

  const handleReorder = async (list_node_id: number, newOrderIds: (string | number)[]) => {
    const orders: [number, number][] = newOrderIds.map((id, idx) => {
      const nodeId = parseInt(id.toString().split('-')[1])
      return [nodeId, idx]
    })

    try {
      await postUpdateOrder({ // Changed API call
        user_iden,
        training_iden,
        lid: list_node_id,
        orders
      })
      fetchData()
      toast.success("排序已更新")
    } catch {
      toast.error("排序失败")
    }
  }

  const handleUpdateDescription = async (list_node_id: number) => {
    const newDesc = prompt("请输入新的描述")
    if (newDesc === null) return
    try {
      await postModifyDesc({ // Changed API call
        user_iden,
        training_iden,
        lid: list_node_id,
        public: newDesc,
        private: ""
      })
      fetchData()
    } catch {
      toast.error("修改失败")
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
              <span className="font-medium">{problemIden[1].replaceAll("problem", "")}</span>
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
          return {
            id,
            content_title,
            content,
            children,
            background: isSubTraining ? "#f3f4f6" : undefined,
            defaultExpanded: true,
            onAdd: () => setActiveListNodeId(nodeId)
          }
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

    const renderAddTools = (listNodeId: number, isSheet = false) => (
      <div className={cn("space-y-4", !isSheet && "mt-4 p-4 border rounded-lg bg-muted/30")}>
        <div className={cn("grid gap-4", !isSheet ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}>
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
                  if (isSheet) setActiveListNodeId(null)
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
                  if (isSheet) setActiveListNodeId(null)
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
            <Button variant="outline" size="sm" onClick={() => setActiveListNodeId(trainingData.problem_list.node_id)}>
              <Plus className="h-4 w-4 mr-2" /> 管理根列表
            </Button>
          </div>
          <TreeTable
            data={treeData}
            enableReorder={true}
            onReorder={(parentId, newOrder) => {
              const listNodeId = parentId ? parseInt(parentId.toString().split('-')[1]) : trainingData.problem_list.node_id
              handleReorder(listNodeId, newOrder)
            }}
          />
        </StandardCard>

        <Sheet open={activeListNodeId !== null} onOpenChange={(open) => !open && setActiveListNodeId(null)}>
          <SheetContent side="right" className="sm:max-w-md">
            <SheetHeader>
              <SheetTitle>添加内容</SheetTitle>
              <SheetDescription>
                正在向节点 (ID: {activeListNodeId}) 添加题目或子模块。
              </SheetDescription>
            </SheetHeader>
            <div className="py-6">
              {activeListNodeId !== null && renderAddTools(activeListNodeId, true)}
            </div>
          </SheetContent>
        </Sheet>
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
        <ManageRightSidebar mode={mode} setMode={handleModeChange} />
      </div>
    </SidebarProvider>
  )
}