"use client"

import { useState, useEffect, useCallback, useMemo, useRef } from "react"
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
import {
  postAddProblemForList,
  postAddProblemList,
  postModifyDesc,
  postRemoveProblem,
  postUpdateOrder,
} from "@/api/client/api_training_manage"
import { ProblemListItem, ProblemListQuery, Training, TrainingProblem, TrainingList } from "@rmjac/api-declare";
import { TreeTable, TreeTableNode } from "@/components/table/treetable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Trash2, ArrowUp, ArrowDown, Plus } from "lucide-react"
import { TypstEditor } from "@/components/editor/typst-editor"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import type * as monaco from "monaco-editor"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

interface TrainingManageToolProps {
  user_iden: string
  training_iden: string
}

type TypstProblemItem =
  | { type: "problem"; iden: string }
  | { type: "submodule"; title: string; children: TypstProblemItem[] }

const parseTypstProblems = (source: string) => {
  const root: TypstProblemItem[] = []
  const warnings: string[] = []
  const stack: Array<{ level: number; items: TypstProblemItem[] }> = [
    { level: 0, items: root },
  ]

  const lines = source.split(/\r?\n/)
  for (const rawLine of lines) {
    const line = rawLine.trim()
    if (!line) continue

    const headingMatch = line.match(/^(=+)\s+(.*)$/)
    if (headingMatch) {
      const level = headingMatch[1].length
      const title = headingMatch[2].trim()
      if (!title) {
        warnings.push("检测到空标题，已跳过")
        continue
      }

      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop()
      }

      const parentLevel = stack[stack.length - 1].level
      if (level > parentLevel + 1) {
        warnings.push(`标题层级跳跃: ${line}`)
      }

      const submodule: TypstProblemItem = { type: "submodule", title, children: [] }
      stack[stack.length - 1].items.push(submodule)
      stack.push({ level, items: submodule.children })
      continue
    }

    const bracketRegex = /\[([^\]]+)\]/g
    let match: RegExpExecArray | null = null
    while ((match = bracketRegex.exec(line)) !== null) {
      const iden = match[1]?.trim()
      if (!iden) continue
      stack[stack.length - 1].items.push({ type: "problem", iden })
    }
  }

  return { items: root, warnings }
}

const serializeTrainingList = (list: TrainingList, depth = 1): string => {
  const lines: string[] = []

  list.own_problem.forEach((item) => {
    if ("ProblemIden" in item) {
      lines.push(`[${item.ProblemIden[1]}]`)
      return
    }

    if ("ProblemTraining" in item) {
      const sub = item.ProblemTraining[1]
      if (lines.length > 0 && lines[lines.length - 1] !== "") {
        lines.push("")
      }
      lines.push(`${"=".repeat(depth)} ${sub.description}`)
      const childLines = serializeTrainingList(sub, depth + 1)
      if (childLines.trim().length > 0) {
        lines.push(...childLines.split("\n"))
      }
      lines.push("")
    }
  })

  return lines.join("\n").replace(/\n{3,}/g, "\n\n").trim()
}

const buildTypstTreeNodes = (
  items: TypstProblemItem[],
  path = "root"
): TreeTableNode[] => {
  return items.map((item, index) => {
    const nodeId = `${path}-${index}-${item.type}`
    if (item.type === "problem") {
      return {
        id: nodeId,
        content_title: "题目",
        content: <span className="font-mono text-xs">{item.iden}</span>,
      }
    }

    return {
      id: nodeId,
      content_title: "子模块",
      content: <span className="font-medium">{item.title}</span>,
      children: buildTypstTreeNodes(item.children, nodeId),
      defaultExpanded: true,
      background: "#f3f4f6",
    }
  })
}

export function TrainingManageTool({ user_iden, training_iden }: TrainingManageToolProps) {
  const [mode, setMode] = useState<ManageMode>("info")
  const [trainingData, setTrainingData] = useState<Training | null>(null)
  const [loading, setLoading] = useState(true)
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [activeListNodeId, setActiveListNodeId] = useState<number | null>(null)
  const [rootPopoverOpen, setRootPopoverOpen] = useState(false)
  const [rootSearchKeyword, setRootSearchKeyword] = useState("")
  const [rootSearchResults, setRootSearchResults] = useState<ProblemListItem[]>([])
  const [rootSearching, setRootSearching] = useState(false)
  const [rootSearchError, setRootSearchError] = useState<string | null>(null)
  const [rootSelectedIndex, setRootSelectedIndex] = useState(0)
  const [rootCursorPos, setRootCursorPos] = useState<number | null>(null)
  const [rootSubmoduleName, setRootSubmoduleName] = useState("")
  const [listSearchKeyword, setListSearchKeyword] = useState("")
  const [listSearchResults, setListSearchResults] = useState<ProblemListItem[]>([])
  const [listSearching, setListSearching] = useState(false)
  const [listSearchError, setListSearchError] = useState<string | null>(null)
  const [listSelectedIndex, setListSelectedIndex] = useState(0)
  const [listCursorPos, setListCursorPos] = useState<number | null>(null)
  const [listSubmoduleName, setListSubmoduleName] = useState("")
  const [problemEditMode, setProblemEditMode] = useState<"tree" | "typst">("tree")
  const [typstSource, setTypstSource] = useState("")
  const [typstDirty, setTypstDirty] = useState(false)
  const [typstSaving, setTypstSaving] = useState(false)

  const rootInputRef = useRef<HTMLInputElement>(null)
  const listInputRef = useRef<HTMLInputElement>(null)
  const typstCompletionDisposableRef = useRef<monaco.IDisposable | null>(null)

  const loadTraining = useCallback(async () => {
    const response = await getTrainingByIden({ user_iden, training_iden })
    const data = response.data
    setTrainingData(data)
    setFormValues({
      title: data.training_node.public.name,
      iden: data.training_node.public.iden,
      description_public: data.training_node.public.description,
      description_private: data.training_node.private.description,
    })
    return data
  }, [user_iden, training_iden])

  const fetchData = useCallback(async () => {
    try {
      await loadTraining()
    } catch (error) {
      console.error("Failed to fetch training data:", error)
    } finally {
      setLoading(false)
    }
  }, [loadTraining])

  useEffect(() => {
    fetchData()
  }, [fetchData])

  const typstParsed = useMemo(() => parseTypstProblems(typstSource), [typstSource])
  const typstTreeData = useMemo(
    () => buildTypstTreeNodes(typstParsed.items),
    [typstParsed.items]
  )

  useEffect(() => {
    if (!trainingData) return
    if (typstDirty) return
    setTypstSource(serializeTrainingList(trainingData.problem_list))
  }, [trainingData, typstDirty])

  useEffect(() => {
    return () => {
      typstCompletionDisposableRef.current?.dispose()
      typstCompletionDisposableRef.current = null
    }
  }, [])

  useEffect(() => {
    if (activeListNodeId !== null) {
      setListSearchKeyword("")
      setListSearchResults([])
      setListSearchError(null)
      setListSelectedIndex(0)
      setListCursorPos(null)
      setListSubmoduleName("")
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

  const fetchProblemSuggestions = useCallback(async (keyword: string) => {
    const trimmed = keyword.trim()
    if (!trimmed) return [] as ProblemListItem[]
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const query: any = {
        page: 1,
        per_page: 10,
        name: trimmed,
        tag: null,
      }
      const response = await searchProblem({ query: query as ProblemListQuery })
      return response.problems
    } catch {
      return [] as ProblemListItem[]
    }
  }, [])

  const handleTypstEditorMount = useCallback(
    (editor: monaco.editor.IStandaloneCodeEditor, monacoInstance: typeof monaco) => {
      typstCompletionDisposableRef.current?.dispose()

      typstCompletionDisposableRef.current = monacoInstance.languages.registerCompletionItemProvider(
        "typst",
        {
          triggerCharacters: ["["],
          provideCompletionItems: async (model, position) => {
            const lineContent = model.getLineContent(position.lineNumber)
            const cursorIndex = position.column - 1
            const before = lineContent.slice(0, cursorIndex)
            const after = lineContent.slice(cursorIndex)

            const lastLeft = before.lastIndexOf("[")
            const lastRight = before.lastIndexOf("]")
            if (lastLeft === -1 || lastRight > lastLeft) {
              return { suggestions: [] }
            }

            const rawKeyword = before.slice(lastLeft + 1)
            const keyword = rawKeyword.trim()
            if (!keyword) {
              return { suggestions: [] }
            }

            const problems = await fetchProblemSuggestions(keyword)
            if (problems.length === 0) return { suggestions: [] }

            const hasClosing = after.trimStart().startsWith("]")
            const insertTextSuffix = hasClosing ? "" : "]"
            const range = new monacoInstance.Range(
              position.lineNumber,
              lastLeft + 2,
              position.lineNumber,
              position.column
            )

            const suggestions = problems.map((item) => ({
              label: `${getProblemName(item)} (${item.iden})`,
              kind: monacoInstance.languages.CompletionItemKind.Reference,
              insertText: `${item.iden}${insertTextSuffix}`,
              range,
              detail: item.iden,
              filterText: `${item.iden} ${getProblemName(item)}`,
            }))

            return { suggestions }
          },
        }
      )
    },
    [fetchProblemSuggestions]
  )

  const parseInputByCursor = (value: string, cursorPos: number | null) => {
    const safeCursor = cursorPos ?? value.length
    const prefix = value.slice(0, safeCursor)
    const lastCommaIndex = prefix.lastIndexOf(",")
    const segmentStart = lastCommaIndex === -1 ? 0 : lastCommaIndex + 1
    const segmentEnd = safeCursor
    const rawSegment = value.slice(segmentStart, segmentEnd)
    const currentSegment = rawSegment.trim()
    const tokens = value
      .slice(0, segmentStart)
      .split(",")
      .map((part) => part.trim())
      .filter(Boolean)

    return {
      tokens,
      currentSegment,
      segmentStart,
      segmentEnd,
    }
  }

  useEffect(() => {
    if (!rootPopoverOpen) return
    setRootSelectedIndex(0)
    const { currentSegment } = parseInputByCursor(rootSearchKeyword, rootCursorPos)
    const timer = setTimeout(() => {
      handleProblemSearch(
        currentSegment,
        setRootSearchResults,
        setRootSearching,
        setRootSearchError,
        { silentOnEmpty: true }
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [rootSearchKeyword, rootCursorPos, rootPopoverOpen, handleProblemSearch])

  useEffect(() => {
    if (activeListNodeId === null) return
    const { currentSegment } = parseInputByCursor(listSearchKeyword, listCursorPos)
    const timer = setTimeout(() => {
      handleProblemSearch(
        currentSegment,
        setListSearchResults,
        setListSearching,
        setListSearchError,
        { silentOnEmpty: true }
      )
    }, 300)
    return () => clearTimeout(timer)
  }, [listSearchKeyword, listCursorPos, activeListNodeId, handleProblemSearch])

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
          node_id: null,
          description: data.description,
          own_problem: []
        };
      } else if (type === "ProblemPresetTraining") {
        if (!data.node_id || !data.iden) {
          toast.error("请输入预设 ID 和标识，格式：ID,标识")
          return
        }
        problem_list_data = {
          node_id: null,
          description: data.description || data.iden,
          own_problem: [],
          ProblemPresetTraining: [parseInt(data.node_id), data.iden]
        } as TrainingList;
      } else {
        if (!data.node_id || !data.iden) {
          toast.error("请输入引用 ID 和标识，格式：ID,标识")
          return
        }
        problem_list_data = {
          node_id: null,
          description: data.description || data.iden,
          own_problem: [],
          ExistTraining: [parseInt(data.node_id), data.iden]
        } as TrainingList;
      }

      const res = await postAddProblemList({
        user_iden,
        training_iden,
        lid: list_node_id,
        problem_list: problem_list_data
      })
      toast.success(`成功创建: ${res.new.public?.description || "新项"}`)
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

  const getTrainingProblemNodeId = (problem: TrainingProblem) => {
    if ("ProblemIden" in problem) return Number(problem.ProblemIden[0])
    if ("ProblemTraining" in problem) return Number(problem.ProblemTraining[1].node_id)
    if ("ProblemPresetTraining" in problem) return Number(problem.ProblemPresetTraining[0])
    return Number(problem.ExistTraining[0])
  }

  const getTrainingProblemIden = (problem: TrainingProblem) => {
    if ("ProblemIden" in problem) return problem.ProblemIden[1]
    return null
  }

  const syncTrainingListStructure = useCallback(async (
    listNodeId: number,
    currentList: TrainingList,
    desiredItems: TypstProblemItem[]
  ) => {
    const existingProblems = currentList.own_problem
      .filter((item) => "ProblemIden" in item)
      .map((item) => ({
        item,
        nodeId: getTrainingProblemNodeId(item),
        iden: getTrainingProblemIden(item) || "",
        matched: false,
      }))

    const existingSubmodules = currentList.own_problem
      .filter((item) => "ProblemTraining" in item)
      .map((item) => ({
        item,
        nodeId: getTrainingProblemNodeId(item),
        title: item.ProblemTraining[1].description,
        list: item.ProblemTraining[1],
        matched: false,
      }))

    const missingProblems: string[] = []

    for (const desired of desiredItems) {
      if (desired.type === "problem") {
        const match = existingProblems.find((p) => !p.matched && p.iden === desired.iden)
        if (match) {
          match.matched = true
        } else {
          missingProblems.push(desired.iden)
        }
        continue
      }

      const subMatch = existingSubmodules.find(
        (s) => !s.matched && s.title === desired.title
      )
      if (subMatch) {
        subMatch.matched = true
        await syncTrainingListStructure(subMatch.nodeId, subMatch.list, desired.children)
      } else {
        const res = await postAddProblemList({
          user_iden,
          training_iden,
          lid: listNodeId,
          problem_list: {
            node_id: null,
            description: desired.title,
            own_problem: [],
          },
        })
        const newNodeId = Number(res.new.node_id)
        await syncTrainingListStructure(
          newNodeId,
          { node_id: newNodeId as unknown as bigint, description: desired.title, own_problem: [] },
          desired.children
        )
      }
    }

    if (missingProblems.length > 0) {
      await postAddProblemForList({
        user_iden,
        training_iden,
        lid: listNodeId,
        problems: missingProblems,
      })
    }

    const removeQueue: number[] = []
    currentList.own_problem.forEach((item) => {
      if ("ProblemIden" in item) {
        const iden = getTrainingProblemIden(item)
        const matched = existingProblems.find(
          (p) => p.nodeId === getTrainingProblemNodeId(item) && p.matched && p.iden === iden
        )
        if (!matched) removeQueue.push(getTrainingProblemNodeId(item))
        return
      }

      if ("ProblemTraining" in item) {
        const matched = existingSubmodules.find(
          (s) => s.nodeId === getTrainingProblemNodeId(item) && s.matched
        )
        if (!matched) removeQueue.push(getTrainingProblemNodeId(item))
        return
      }

      removeQueue.push(getTrainingProblemNodeId(item))
    })

    for (const edgeId of removeQueue) {
      await postRemoveProblem({
        user_iden,
        training_iden,
        lid: listNodeId,
        edge_id: edgeId,
      })
    }
  }, [training_iden, user_iden])

  const syncTrainingListOrder = useCallback(async (
    listNodeId: number,
    currentList: TrainingList,
    desiredItems: TypstProblemItem[]
  ) => {
    const problemMap = new Map<string, number[]>()
    const submoduleMap = new Map<string, { nodeId: number; list: TrainingList }[]>()

    currentList.own_problem.forEach((item) => {
      if ("ProblemIden" in item) {
        const iden = getTrainingProblemIden(item)
        if (!iden) return
        const entry = problemMap.get(iden) || []
        entry.push(getTrainingProblemNodeId(item))
        problemMap.set(iden, entry)
        return
      }
      if ("ProblemTraining" in item) {
        const title = item.ProblemTraining[1].description
        const entry = submoduleMap.get(title) || []
        entry.push({ nodeId: getTrainingProblemNodeId(item), list: item.ProblemTraining[1] })
        submoduleMap.set(title, entry)
      }
    })

    const desiredNodeIds: number[] = []
    for (const desired of desiredItems) {
      if (desired.type === "problem") {
        const entry = problemMap.get(desired.iden)
        const nodeId = entry?.shift()
        if (nodeId != null) desiredNodeIds.push(nodeId)
        continue
      }

      const entry = submoduleMap.get(desired.title)
      const nodeEntry = entry?.shift()
      if (nodeEntry) {
        desiredNodeIds.push(nodeEntry.nodeId)
        await syncTrainingListOrder(nodeEntry.nodeId, nodeEntry.list, desired.children)
      }
    }

    const currentOrder = currentList.own_problem.map((item) => getTrainingProblemNodeId(item))
    if (
      desiredNodeIds.length === currentOrder.length &&
      desiredNodeIds.every((id, idx) => id === currentOrder[idx])
    ) {
      return
    }

    if (desiredNodeIds.length === 0) return

    const orders: [number, number][] = desiredNodeIds.map((nodeId, idx) => [nodeId, idx])
    await postUpdateOrder({
      user_iden,
      training_iden,
      lid: listNodeId,
      orders,
    })
  }, [training_iden, user_iden])

  const handleSaveTypst = useCallback(async () => {
    if (!trainingData) {
      toast.error("训练数据未加载")
      return
    }
    if (typstSaving) return

    setTypstSaving(true)
    try {
      const rootListNodeId = trainingData.problem_list.node_id
        ? Number(trainingData.problem_list.node_id)
        : 0

      const desiredItems = typstParsed.items

      if (typstParsed.warnings.length > 0) {
        toast.info(`Typst 解析提示：${typstParsed.warnings.join("；")}`)
      }

      await syncTrainingListStructure(rootListNodeId, trainingData.problem_list, desiredItems)

      const latest = await loadTraining()
      const latestRootId = latest.problem_list.node_id
        ? Number(latest.problem_list.node_id)
        : rootListNodeId

      await syncTrainingListOrder(latestRootId, latest.problem_list, desiredItems)

      await loadTraining()
      setTypstDirty(false)
      toast.success("题单已同步")
    } catch (err) {
      toast.error(`保存失败: ${err instanceof Error ? err.message : String(err)}`)
    } finally {
      setTypstSaving(false)
    }
  }, [
    loadTraining,
    syncTrainingListOrder,
    syncTrainingListStructure,
    trainingData,
    typstParsed.items,
    typstParsed.warnings,
    typstSaving,
  ])

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      if (problemEditMode !== "typst") return
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault()
        handleSaveTypst()
      }
    }
    window.addEventListener("keydown", handleKeydown)
    return () => window.removeEventListener("keydown", handleKeydown)
  }, [handleSaveTypst, problemEditMode])

  const handleMove = async (list_node_id: number, currentIndex: number, direction: 'up' | 'down', own_problem: TrainingProblem[]) => {
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (newIndex < 0 || newIndex >= own_problem.length) return

    const newProblems = [...own_problem]
    const temp = newProblems[currentIndex]
    newProblems[currentIndex] = newProblems[newIndex]
    newProblems[newIndex] = temp

    const orders: [number, number][] = newProblems.map((p, idx) => [getTrainingProblemNodeId(p), idx])

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
      cursorPos: number | null,
      setCursorPos: React.Dispatch<React.SetStateAction<number | null>>,
      selectedIndex: number,
      setSelectedIndex: React.Dispatch<React.SetStateAction<number>>,
      results: ProblemListItem[],
      searching: boolean,
      error: string | null,
      submoduleName: string,
      setSubmoduleName: React.Dispatch<React.SetStateAction<string>>,
      inputRef: React.RefObject<HTMLInputElement | null>,
      autoFocus = false
    ) => {
      const { tokens, currentSegment, segmentStart, segmentEnd } = parseInputByCursor(keyword, cursorPos)
      const showSuggestions = currentSegment.length > 0 && (searching || results.length > 0 || !!error)
      const safeIndex = Math.min(selectedIndex, Math.max(results.length - 1, 0))

      if (safeIndex !== selectedIndex) {
        setSelectedIndex(safeIndex)
      }

      const updateCursorFromEvent = (event: React.SyntheticEvent<HTMLInputElement>) => {
        const nextPos = event.currentTarget.selectionStart
        setCursorPos(typeof nextPos === "number" ? nextPos : null)
      }

      const insertProblemIden = (iden: string) => {
        const before = keyword.slice(0, segmentStart)
        const after = keyword.slice(segmentEnd)
        const appendComma = after.trim().length === 0
        const nextValue = `${before}${iden}${appendComma ? ", " : ""}${after}`
        const nextCursor = before.length + iden.length + (appendComma ? 2 : 0)

        setKeyword(nextValue)
        setCursorPos(nextCursor)
        requestAnimationFrame(() => {
          inputRef.current?.focus()
          inputRef.current?.setSelectionRange(nextCursor, nextCursor)
        })
      }

      const handleSubmitProblems = () => {
        if (!keyword.trim()) {
          toast.info("请输入题目标识")
          return
        }
        handleAddProblem(listNodeId, keyword)
      }

      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  placeholder="输入题目标识，逗号分隔"
                  value={keyword}
                  autoFocus={autoFocus}
                  maxLength={256}
                  onChange={(e) => {
                    setKeyword(e.target.value)
                    updateCursorFromEvent(e)
                    setSelectedIndex(0)
                  }}
                  onClick={updateCursorFromEvent}
                  onKeyUp={updateCursorFromEvent}
                  onKeyDown={(e) => {
                    if (e.key === "ArrowUp" || e.key === "ArrowDown") {
                      e.preventDefault()
                      setSelectedIndex((prev) => {
                        if (e.key === "ArrowUp") return Math.max(prev - 1, 0)
                        return Math.min(prev + 1, Math.max(results.length - 1, 0))
                      })
                      return
                    }
                    if (e.key === "Enter") {
                      e.preventDefault()
                      if (showSuggestions && results[safeIndex]) {
                        insertProblemIden(results[safeIndex].iden)
                        return
                      }
                      handleSubmitProblems()
                    }
                  }}
                  className="h-8"
                />
                {showSuggestions && (
                  <div className="absolute left-0 right-0 top-full z-50 mt-1 rounded-md border bg-background shadow">
                    {searching && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">搜索中...</div>
                    )}
                    {!searching && error && (
                      <div className="px-3 py-2 text-xs text-red-600">{error}</div>
                    )}
                    {!searching && !error && results.length === 0 && (
                      <div className="px-3 py-2 text-xs text-muted-foreground">未找到匹配题目</div>
                    )}
                    {!searching && results.length > 0 && (
                      <div className="max-h-48 overflow-auto">
                        {results.map((item, index) => (
                          <button
                            key={item.iden}
                            type="button"
                            className={cn(
                              "flex w-full items-center justify-between px-3 py-2 text-left text-xs",
                              index === safeIndex ? "bg-primary/10" : "hover:bg-muted"
                            )}
                            onMouseDown={(event) => event.preventDefault()}
                            onClick={() => insertProblemIden(item.iden)}
                          >
                            <span className="truncate">{getProblemName(item)}</span>
                            <span className="ml-2 font-mono text-[10px] text-muted-foreground">{item.iden}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <Button size="sm" onClick={handleSubmitProblems} disabled={searching}>
                添加题目
              </Button>
            </div>
            {tokens.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {tokens.map((token, index) => (
                  <span key={`${token}-${index}`} className="rounded bg-muted px-2 py-1 text-[11px] text-muted-foreground">
                    {token}
                  </span>
                ))}
              </div>
            )}
            {currentSegment.length > 0 && results.length === 0 && !searching && !error && (
              <div className="text-xs text-muted-foreground">未找到题目，仍可直接添加 ID。</div>
            )}
          </div>

          <div className="rounded-md border p-3 bg-muted/20">
            <div className="text-sm font-medium mb-2">创建为子模块</div>
            <div className="flex items-center gap-2">
              <Input
                placeholder={currentSegment ? `输入子模块名称（留空使用：${currentSegment}）` : "输入子模块名称"}
                value={submoduleName}
                maxLength={64}
                onChange={(e) => setSubmoduleName(e.target.value)}
                className="h-8"
              />
              <Button
                size="sm"
                variant="secondary"
                onClick={async () => {
                  const nameToUse = submoduleName.trim() || currentSegment.trim()
                  await handleCreateSubmodule(nameToUse, listNodeId)
                  setSubmoduleName("")
                }}
              >
                创建
              </Button>
            </div>
          </div>
        </div>
      )
    }

    const transformToTreeNodes = (list: TrainingList, parentListNodeId: number): TreeTableNode[] => {
      return list.own_problem.map((p: TrainingProblem, index: number) => {
        const isSubTraining = "ProblemTraining" in p
        const nodeId = getTrainingProblemNodeId(p)

        const id = `node-${nodeId}-${index}`
        
        let content_title = ""
        let content: React.ReactNode = null
        let children: TreeTableNode[] = []

        if ("ProblemIden" in p) {
          const problemIden = p.ProblemIden
          content_title = "题目"
          content = (
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">{problemIden[1].replaceAll("problem", "")}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'up', list.own_problem) }} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'down', list.own_problem) }} disabled={index === list.own_problem.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleRemoveProblem(parentListNodeId, problemIden[0]) }}><Trash2 className="h-4 w-4" /></Button>
              </div>
            </div>
          )
        } else if ("ProblemTraining" in p) {
          const subTraining = p.ProblemTraining[1]
          content_title = "子模块"
          content = (
            <div className="flex items-center justify-between w-full">
              <span className="font-medium">{subTraining.description}</span>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" className="h-8 px-2" onClick={(e) => { e.stopPropagation(); handleUpdateDescription(nodeId) }}>编辑描述</Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'up', list.own_problem) }} disabled={index === 0}><ArrowUp className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={(e) => { e.stopPropagation(); handleMove(parentListNodeId, index, 'down', list.own_problem) }} disabled={index === list.own_problem.length - 1}><ArrowDown className="h-4 w-4" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={(e) => { e.stopPropagation(); handleRemoveProblem(parentListNodeId, Number(p.ProblemTraining[0])) }}><Trash2 className="h-4 w-4" /></Button>
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
              listCursorPos,
              setListCursorPos,
              listSelectedIndex,
              setListSelectedIndex,
              listSearchResults,
              listSearching,
              listSearchError,
              listSubmoduleName,
              setListSubmoduleName,
              listInputRef,
              true
            ),
            addPopoverOpen: activeListNodeId === nodeId,
            onAddPopoverOpenChange: (open) => setActiveListNodeId(open ? nodeId : null)
          }
        } else if ("ProblemPresetTraining" in p) {
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
        } else if ("ExistTraining" in p) {
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

    const rootListNodeId = trainingData.problem_list.node_id ? Number(trainingData.problem_list.node_id) : 0
    const treeData = transformToTreeNodes(trainingData.problem_list, rootListNodeId)

    const handleCreateSubmodule = async (name: string, listNodeId: number) => {
      const trimmed = name.trim()
      if (!trimmed) {
        toast.error("请输入关键词作为子模块名称")
        return
      }
      await handleAddTrainingProblem(listNodeId, "ProblemTraining", { description: trimmed })
    }

    return (
      <div className="space-y-6">
        <StandardCard title="编辑方式">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Tabs
              value={problemEditMode}
              onValueChange={(value) => setProblemEditMode(value as "tree" | "typst")}
            >
              <TabsList>
                <TabsTrigger value="tree">树形管理</TabsTrigger>
                <TabsTrigger value="typst">Typst 编辑</TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="text-xs text-muted-foreground">
              Typst 模式支持标题生成子模块与 [题目id]
            </div>
          </div>
        </StandardCard>

        {problemEditMode === "tree" ? (
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
                    rootCursorPos,
                    setRootCursorPos,
                    rootSelectedIndex,
                    setRootSelectedIndex,
                    rootSearchResults,
                    rootSearching,
                    rootSearchError,
                    rootSubmoduleName,
                    setRootSubmoduleName,
                    rootInputRef,
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
        ) : (
          <StandardCard title="Typst 题单编辑">
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                使用 “=” 标题创建子模块，使用 [题目id] 添加题目。支持 Ctrl/⌘ + S 保存。
              </div>

              {typstParsed.warnings.length > 0 && (
                <div className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                  {typstParsed.warnings.join("；")}
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <div className="text-sm font-medium">编辑器</div>
                  <TypstEditor
                    value={typstSource}
                    onChange={(value) => {
                      setTypstSource(value)
                      setTypstDirty(true)
                    }}
                    height="520px"
                    onMount={handleTypstEditorMount}
                    onRender={() => {}}
                  />
                </div>
                <div className="space-y-2">
                  <div className="text-sm font-medium">树形预览</div>
                  <div className="border rounded-md p-3 bg-white min-h-130 overflow-auto">
                    {typstTreeData.length === 0 ? (
                      <div className="text-xs text-muted-foreground">暂无解析结果</div>
                    ) : (
                      <TreeTable data={typstTreeData} />
                    )}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button onClick={handleSaveTypst} disabled={typstSaving}>
                  {typstSaving ? "保存中..." : "保存 (Ctrl/⌘ + S)"}
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setTypstSource(serializeTrainingList(trainingData.problem_list))
                    setTypstDirty(false)
                  }}
                >
                  从当前题单重置
                </Button>
                {typstDirty && <span className="text-xs text-muted-foreground">未保存</span>}
              </div>
            </div>
          </StandardCard>
        )}

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