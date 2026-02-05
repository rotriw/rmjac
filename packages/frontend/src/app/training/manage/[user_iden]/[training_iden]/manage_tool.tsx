"use client"

import { useState, useEffect, useCallback } from "react"
import { cn } from "@/lib/utils"
import { TitleCard } from "@/components/card/card"
import { toast } from "sonner"
import { FormQuery } from "@/components/tools/query"
import { StandardCard } from "@/components/card/card"
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { ManageRightSidebar, ManageMode } from "./rightbar"
import PermissionsEditor from "./permissions-editor"
import { postView as getTrainingByIden } from "@/api/client/api_training_view"
import { postSearch as searchProblem } from "@/api/client/api_problem_search"
import { postCreate as createProblem } from "@/api/client/api_problem_create"
import {
  postAddProblemForList,
  postAddProblemList,
  postModifyDesc,
  postRemoveProblem,
  postUpdateOrder,
} from "@/api/client/api_training_manage"
import { ProblemListItem, ProblemListQuery, ProblemStatementProp, Training, TrainingProblem, TrainingList } from "@rmjac/api-declare";
import { TreeTable, TreeTableNode } from "@/components/table/treetable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, ArrowUp, ArrowDown, Plus, FolderPlus } from "lucide-react"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

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
  const [rootPopoverOpen, setRootPopoverOpen] = useState(false)
  const [rootSearchKeyword, setRootSearchKeyword] = useState("")
  const [rootSearchResults, setRootSearchResults] = useState<ProblemListItem[]>([])
  const [rootSearching, setRootSearching] = useState(false)
  const [rootSearchError, setRootSearchError] = useState<string | null>(null)
  const [rootSelectedIndex, setRootSelectedIndex] = useState(0)
  const [listSearchKeyword, setListSearchKeyword] = useState("")
  const [listSearchResults, setListSearchResults] = useState<ProblemListItem[]>([])
  const [listSearching, setListSearching] = useState(false)
  const [listSearchError, setListSearchError] = useState<string | null>(null)
  const [listSelectedIndex, setListSelectedIndex] = useState(0)

  const fetchData = useCallback(async () => {
    try {
      const response = await getTrainingByIden({ user_iden, training_iden });
      const data = response.data;
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
    if (activeListNodeId !== null) {
      setListSearchKeyword("")
      setListSearchResults([])
      setListSearchError(null)
      setListSelectedIndex(0)
    }
  }, [activeListNodeId])

  const handleProblemSearch = useCallback(async (
    keyword: string,
    setResults: React.Dispatch<React.SetStateAction<ProblemListItem[]>>,
    setSearching: React.Dispatch<React.SetStateAction<boolean>>,
    setError: React.Dispatch<React.SetStateAction<string | null>>,
    options?: { silentOnEmpty?: boolean }
  ) => {
    const trimmed = keyword.trim()
    if (!trimmed) {
      if (!options?.silentOnEmpty) {
        toast.info("请输入搜索关键词")
      }
      setResults([])
      setError(null)
      setSearching(false)
      return
    }
    setSearching(true)
    setError(null)
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: any = {
        page: 1,
        per_page: 10,
        name: trimmed,
        tag: null,
      }
      const response = await searchProblem({ query: query as ProblemListQuery })
      setResults(response.problems)
    } catch (error) {
      setError(error instanceof Error ? error.message : "搜索失败")
      setResults([])
    } finally {
      setSearching(false)
    }
  }, [])

  useEffect(() => {
    if (!rootPopoverOpen) return
    setRootSelectedIndex(0)
    const timer = setTimeout(() => {
      handleProblemSearch(
        rootSearchKeyword,
        setRootSearchResults,
        setRootSearching,
        setRootSearchError,
        { silentOnEmpty: true }
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [rootSearchKeyword, rootPopoverOpen, handleProblemSearch])

  useEffect(() => {
    if (activeListNodeId === null) return
    const timer = setTimeout(() => {
      handleProblemSearch(
        listSearchKeyword,
        setListSearchResults,
        setListSearching,
        setListSearchError,
        { silentOnEmpty: true }
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [listSearchKeyword, activeListNodeId, handleProblemSearch])

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
    // 当前没有更新训练基本信息的 API，只能保存本地表单值
    toast.info("训练基本信息的编辑功能需要后端 API 支持")
  }

  const handleAddProblem = async (list_node_id: number, problemsStr: string) => {
    const problems = problemsStr.split(",").map(p => p.trim()).filter(p => p)
    if (problems.length === 0) {
      toast.error("请输入至少一个题目标识")
      return
    }
    try {
      if (!trainingData) {
        toast.error("训练数据未加载")
        return
      }
      const res = await postAddProblemForList({
        user_iden,
        training_iden,
        problems,
        lid: list_node_id,
      })
      toast.success(`成功添加 ${res.successful_data.length} 个题目，失败 ${res.failed_count} 个`)
      if (res.failed.length > 0) {
        toast.info(`失败题目: ${res.failed.join(", ")}`)
      }
      fetchData()
    } catch(err) {
      toast.error(`添加失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleAddTrainingProblem = async (
    list_node_id: number,
    type: "ProblemTraining" | "ProblemPresetTraining" | "ExistTraining",
    data: { description?: string; node_id?: string; iden?: string }
  ) => {
    try {
      let problem_list_data: TrainingList;
      if (type === "ProblemTraining") {
        if (!data.description || data.description.trim() === "") {
          toast.error("请输入子模块名称")
          return
        }
        problem_list_data = {
          description: data.description,
          own_problem: []
        };
      } else if (type === "ProblemPresetTraining") {
        if (!data.node_id || !data.iden) {
          toast.error("请输入预设 ID 和标识，格式：ID,标识")
          return
        }
        problem_list_data = {
          description: data.description || data.iden,
          own_problem: [],
          ProblemPresetTraining: [parseInt(data.node_id), data.iden]
        };
      } else {
        if (!data.node_id || !data.iden) {
          toast.error("请输入引用 ID 和标识，格式：ID,标识")
          return
        }
        problem_list_data = {
          description: data.description || data.iden,
          own_problem: [],
          ExistTraining: [parseInt(data.node_id), data.iden]
        };
      }

      const res = await postAddProblemList({
        user_iden,
        training_iden,
        lid: list_node_id,
        problem_list: problem_list_data
      })
      toast.success(`成功创建: ${res.new.description || "新项"}`)
      fetchData()
    } catch(err) {
      toast.error(`操作失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleRemoveProblem = async (list_node_id: number, delete_node_id: number) => {
    if (!confirm("确定要删除吗？此操作不可撤销。")) return
    try {
      const res = await postRemoveProblem({
        user_iden,
        training_iden,
        lid: list_node_id,
        edge_id: delete_node_id
      })
      toast.success(res.message || "删除成功")
      fetchData()
    } catch(err) {
      toast.error(`删除失败: ${err instanceof Error ? err.message : String(err)}`)
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
      const res = await postUpdateOrder({
        user_iden,
        training_iden,
        lid: list_node_id,
        orders
      })
      toast.success(res.message || "排序成功")
      fetchData()
    } catch(err) {
      toast.error(`排序失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleReorder = async (list_node_id: number, newOrderIds: (string | number)[]) => {
    const orders: [number, number][] = newOrderIds.map((id, idx) => {
      const nodeId = parseInt(id.toString().split('-')[1])
      return [nodeId, idx]
    })

    try {
      const res = await postUpdateOrder({
        user_iden,
        training_iden,
        lid: list_node_id,
        orders
      })
      toast.success(res.message || "排序已更新")
      fetchData()
    } catch(err) {
      toast.error(`排序失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const handleUpdateDescription = async (list_node_id: number) => {
    const newDesc = prompt("请输入新的描述：")
    if (newDesc === null || newDesc.trim() === "") return
    try {
      const res = await postModifyDesc({
        user_iden,
        training_iden,
        lid: list_node_id,
        public: newDesc,
        private: ""
      })
      toast.success(res.message || "描述已更新")
      fetchData()
    } catch(err) {
      toast.error(`修改失败: ${err instanceof Error ? err.message : String(err)}`)
    }
  }

  const getProblemName = (item: ProblemListItem) => item.model.problem_node.public.name
  const getProblemTags = (item: ProblemListItem) => item.model.tag.map(t => t.public.tag_name)

  const renderInfoMode = () => (
    <div className="space-y-6">
      <FormQuery
        fields={[
          {
            type: "group",
            title: "基本信息",
            children: [
              { type: "input", name: "title", title: "训练标题" },
              { type: "input", name: "iden", title: "训练标识 (iden)" },
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

    const renderManagePanel = (
      listNodeId: number,
      keyword: string,
      setKeyword: React.Dispatch<React.SetStateAction<string>>,
      selectedIndex: number,
      setSelectedIndex: React.Dispatch<React.SetStateAction<number>>,
      results: ProblemListItem[],
      searching: boolean,
      error: string | null,
      setResults: React.Dispatch<React.SetStateAction<ProblemListItem[]>>,
      setSearching: React.Dispatch<React.SetStateAction<boolean>>,
      setError: React.Dispatch<React.SetStateAction<string | null>>,
      autoFocus = false
    ) => {
      const optionItems = [
        ...results.map((item) => ({ type: "problem" as const, item })),
        { type: "submodule" as const, label: `创建子模块：${keyword || "（未输入）"}` },
        { type: "placeholder" as const, label: "创建占位题面并加入当前列表" }
      ]

      const safeIndex = Math.min(selectedIndex, Math.max(optionItems.length - 1, 0))
      if (safeIndex !== selectedIndex) {
        setSelectedIndex(safeIndex)
      }

      const handleExecute = () => {
        if (keyword.includes(",")) {
          handleBatchAddProblems(listNodeId, keyword)
          return
        }
        const selected = optionItems[safeIndex]
        if (!selected) return
        if (selected.type === "submodule") {
          handleCreateSubmodule(keyword, listNodeId)
        } else if (selected.type === "placeholder") {
          handleCreatePlaceholderProblem(keyword, listNodeId)
        } else {
          handleAddProblem(listNodeId, selected.item.iden)
        }
      }

      return (
      <div className="space-y-3">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2">
            <Input
              placeholder="搜索题目名称或 ID"
              value={keyword}
              autoFocus={autoFocus}
              maxLength={64}
              onChange={(e) => setKeyword(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault()
                  handleExecute()
                }
                if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                  e.preventDefault()
                  setSelectedIndex((prev) => {
                    if (e.key === "ArrowUp") return Math.max(prev - 1, 0)
                    return Math.min(prev + 1, optionItems.length - 1)
                  })
                }
                if (e.key === "Tab") {
                  e.preventDefault()
                  setSelectedIndex((prev) => (prev + 1) % Math.max(optionItems.length, 1))
                }
              }}
              className="h-8"
            />
            <Button size="sm" onClick={() => handleProblemSearch(keyword, setResults, setSearching, setError, { silentOnEmpty: false })} disabled={searching}>
              {searching ? "搜索中..." : "搜索"}
            </Button>
          </div>
          {error && (
            <div className="text-xs text-red-600">{error}</div>
          )}
          <div className="rounded-md border">
            {searching ? (
              <div className="text-xs text-muted-foreground py-4 text-center">搜索中...</div>
            ) : (
              <div className="divide-y">
                {optionItems.map((option, index) => {
                  const isSelected = index === safeIndex
                  if (option.type === "problem") {
                    const item = option.item
                    return (
                      <button
                        key={item.iden}
                        type="button"
                        className={cn(
                          "flex w-full items-center gap-2 px-3 py-2 text-left",
                          isSelected ? "bg-primary/10" : "hover:bg-muted"
                        )}
                        onClick={() => setSelectedIndex(index)}
                      >
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-medium">{getProblemName(item)}</div>
                          <div className="text-xs text-muted-foreground">ID: {item.iden}</div>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {getProblemTags(item).slice(0, 3).map((tag) => (
                              <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                                {tag}
                              </span>
                            ))}
                          </div>
                        </div>
                      </button>
                    )
                  }

                  return (
                    <button
                      key={option.type}
                      type="button"
                      className={cn(
                        "flex w-full items-center px-3 py-2 text-left text-xs",
                        isSelected ? "bg-primary/10" : "hover:bg-muted"
                      )}
                      onClick={() => setSelectedIndex(index)}
                    >
                      {option.label}
                    </button>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-end">
            <Button
              size="sm"
              variant={safeIndex === 1 ? "secondary" : "default"}
              onClick={handleExecute}
            >
              回车可提交
            </Button>
          </div>
        </div>
      </div>
    )
  }

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
            onAdd: () => setActiveListNodeId(nodeId),
            addPopoverContent: renderManagePanel(
              nodeId,
              listSearchKeyword,
              setListSearchKeyword,
              listSelectedIndex,
              setListSelectedIndex,
              listSearchResults,
              listSearching,
              listSearchError,
              setListSearchResults,
              setListSearching,
              setListSearchError,
              true
            ),
            addPopoverOpen: activeListNodeId === nodeId,
            onAddPopoverOpenChange: (open) => setActiveListNodeId(open ? nodeId : null)
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

    const rootListNodeId = trainingData.problem_list.node_id
    const treeData = transformToTreeNodes(trainingData.problem_list, rootListNodeId)

    const renderAddTools = (listNodeId: number, isSheet = false) => (
      <div className={cn("space-y-3", !isSheet && "mt-4 p-4 border rounded-lg bg-muted/30")}> 
        <div className={cn("grid gap-3", !isSheet ? "grid-cols-1 md:grid-cols-2" : "grid-cols-1")}> 
          <div className="space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-2"><Plus className="h-4 w-4" /> 快速添加题目</p>
            <div className="flex gap-2">
              <Input
                id={`add-p-${listNodeId}`}
                placeholder="P1000, P1001"
                className="h-8"
              />
              <Button
                size="sm"
                onClick={() => {
                  const input = document.getElementById(`add-p-${listNodeId}`) as HTMLInputElement
                  if (input.value.trim()) {
                    handleAddProblem(listNodeId, input.value)
                    input.value = ""
                    if (isSheet) setActiveListNodeId(null)
                  }
                }}
              >
                添加
              </Button>
            </div>
          </div>
          
          <div className="space-y-1.5">
            <p className="text-sm font-medium flex items-center gap-2"><FolderPlus className="h-4 w-4" /> 创建子模块 / 引用</p>
            <div className="flex gap-2">
              <Input
                id={`add-l-${listNodeId}`}
                placeholder="名称 或 ID,标识"
                className="h-8"
              />
              <select
                id={`type-l-${listNodeId}`}
                title="类型"
                className="h-8 rounded-md border border-input bg-background px-2 py-1 text-sm"
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
                  if (input.value.trim()) {
                    if (type === "ProblemTraining") {
                      handleAddTrainingProblem(listNodeId, type, { description: input.value })
                    } else {
                      const [node_id, iden] = input.value.split(",").map(s => s.trim())
                      handleAddTrainingProblem(listNodeId, type, { node_id, iden, description: iden })
                    }
                    input.value = ""
                    if (isSheet) setActiveListNodeId(null)
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

    const handleCreateSubmodule = async (keyword: string, listNodeId: number) => {
      const trimmed = keyword.trim()
      if (!trimmed) {
        toast.error("请输入关键词作为子模块名称")
        return
      }
      await handleAddTrainingProblem(listNodeId, "ProblemTraining", { description: trimmed })
    }

    const handleCreatePlaceholderProblem = async (keyword: string, listNodeId: number) => {
      const trimmed = keyword.trim()
      if (!trimmed) {
        toast.error("请输入关键词作为题面名称")
        return
      }
      const problemIden = trimmed.replace(/\s+/g, "_")
      const problemStatements: ProblemStatementProp[] = [
        {
          statement_source: "",
          iden: problemIden,
          problem_statements: [
            { iden: "description", content: "请在此处填写题目描述" }
          ],
          time_limit: 1000,
          memory_limit: 256,
          sample_group: [],
          show_order: ["description"],
          page_source: null,
          page_rendered: null,
          problem_difficulty: null,
          judge_option: null,
        }
      ]
      try {
        await createProblem({
          problem_iden: problemIden,
          problem_name: trimmed,
          problem_statement: problemStatements,
          tags: [],
        })
        await handleAddProblem(listNodeId, problemIden)
      } catch (error) {
        toast.error(`创建占位题面失败: ${error instanceof Error ? error.message : String(error)}`)
      }
    }

    const handleBatchAddProblems = async (listNodeId: number, keyword: string) => {
      const parts = keyword.split(",").map((part) => part.trim()).filter(Boolean)
      if (parts.length === 0) {
        toast.error("请输入题目标识")
        return
      }
      await handleAddProblem(listNodeId, parts.join(","))
    }

    return (
      <div className="space-y-6">
        <StandardCard title="题目列表管理">
          <div className="mb-4 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              当前根列表: <span className="font-mono">{trainingData.problem_list.description}</span> (ID: {trainingData.problem_list.node_id})
            </div>
            <Popover open={rootPopoverOpen} onOpenChange={setRootPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-2" /> 管理根列表
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-90 p-3">
                <div className="text-sm font-medium mb-2">根列表管理</div>
                {renderManagePanel(
                  rootListNodeId,
                  rootSearchKeyword,
                  setRootSearchKeyword,
                  rootSelectedIndex,
                  setRootSelectedIndex,
                  rootSearchResults,
                  rootSearching,
                  rootSearchError,
                  setRootSearchResults,
                  setRootSearching,
                  setRootSearchError,
                  true
                )}
              </PopoverContent>
            </Popover>
          </div>
          <TreeTable
            data={treeData}
            enableReorder={true}
            onReorder={(parentId, newOrder) => {
              const listNodeId = parentId ? parseInt(parentId.toString().split('-')[1]) : rootListNodeId
              handleReorder(listNodeId, newOrder)
            }}
          />
        </StandardCard>

      </div>
    )
  }

  const renderPermissionsMode = () => (
    <PermissionsEditor userIden={user_iden} trainingIden={training_iden} />
  )

  if (loading) return <div className="p-8">加载中...</div>

  return (
    <SidebarProvider>
      <div className="flex w-full">
        <SidebarInset className="flex-1">
          <div className="container mx-auto py-6 px-4 md:px-6">
            <TitleCard 
              title={`管理训练: ${trainingData?.training_node.public.name}`} 
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