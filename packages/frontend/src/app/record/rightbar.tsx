"use client"

import * as React from "react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Search as SearchIcon, Loader2, FolderSearch } from "lucide-react"
import { RightSidebar } from "@/components/layout/right-sidebar"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { postSearch } from "@/api/client/api_search_default"
import type { Filters } from "./utils"
import { JUDGE_STATUS_OPTIONS } from "./utils"

interface SearchResult {
  iden: string
  name: string
}

interface RecordRightSidebarProps {
  filters: Filters
  setFilters: (filters: Filters) => void
  onSearch: () => void
  loading: boolean
  loadedCount: number
}

export function RecordRightSidebar({
  filters,
  setFilters,
  onSearch,
  loading,
  loadedCount,
}: RecordRightSidebarProps) {
  const [searchTerm, setSearchTerm] = React.useState("")
  const [searchResults, setSearchResults] = React.useState<SearchResult[]>([])
  const [searching, setSearching] = React.useState(false)
  const [popoverOpen, setPopoverOpen] = React.useState(false)
  const timerRef = React.useRef<NodeJS.Timeout | null>(null)

  const handleProblemSearch = (term: string) => {
    setSearchTerm(term)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (!term.trim()) {
      setSearchResults([])
      return
    }
    timerRef.current = setTimeout(async () => {
      setSearching(true)
      try {
        const res = await postSearch({ iden: term, offset: 0, number: 10 })
        const results: SearchResult[] = (res.problem ?? []).map((p: any) => ({
          iden: p.iden ?? "",
          name: p.problem_node?.public?.name ?? p.iden ?? "",
        }))
        setSearchResults(results)
      } catch {
        setSearchResults([])
      } finally {
        setSearching(false)
      }
    }, 400)
  }

  return (
    <RightSidebar defaultWidth={300} minWidth={250} maxWidth={500} resizable={false}>
      <SidebarGroup>
        <SidebarGroupLabel>搜索筛选</SidebarGroupLabel>
        <SidebarGroupContent className="p-4 space-y-6">
          <div className="flex items-center justify-between px-1">
            <span className="text-sm font-medium opacity-60">已加载</span>
            <span className="text-sm font-bold">{loadedCount}</span>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">用户 ID</Label>
            <Input
              placeholder="用户 ID"
              value={filters.userId}
              onChange={(e) => setFilters({ ...filters, userId: e.target.value })}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">题目 Iden</Label>
            <div className="flex gap-2">
              <Input
                placeholder="题目 Iden"
                value={filters.problemIden}
                onChange={(e) => setFilters({ ...filters, problemIden: e.target.value })}
              />
              <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
                <PopoverTrigger asChild>
                  <Button variant="outline" size="icon" title="搜索题目">
                    <FolderSearch className="h-4 w-4" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-75 p-2" align="end">
                  <Input
                    placeholder="搜索题目..."
                    value={searchTerm}
                    onChange={(e) => handleProblemSearch(e.target.value)}
                    className="mb-2"
                  />
                  {searching && (
                    <div className="flex justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    </div>
                  )}
                  {!searching && searchResults.length > 0 && (
                    <div className="max-h-48 overflow-y-auto space-y-1">
                      {searchResults.map((item) => (
                        <button
                          key={item.iden}
                          className="w-full text-left px-2 py-1.5 text-sm rounded hover:bg-accent truncate"
                          onClick={() => {
                            setFilters({ ...filters, problemIden: item.iden })
                            setPopoverOpen(false)
                            setSearchTerm("")
                            setSearchResults([])
                          }}
                        >
                          <span className="font-medium">{item.name}</span>
                          <span className="ml-2 text-muted-foreground text-xs">{item.iden}</span>
                        </button>
                      ))}
                    </div>
                  )}
                  {!searching && searchTerm && searchResults.length === 0 && (
                    <div className="text-center text-sm text-muted-foreground py-2">无结果</div>
                  )}
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">状态</Label>
            <Select
              value={filters.status}
              onValueChange={(value) => setFilters({ ...filters, status: value })}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                {JUDGE_STATUS_OPTIONS.map((opt) => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">代码长度 (B)</Label>
            <Input
              placeholder="代码长度"
              type="number"
              value={filters.codeLength}
              onChange={(e) => setFilters({ ...filters, codeLength: e.target.value })}
            />
          </div>

          <Button
            variant="ghost"
            className="w-full border"
            disabled={loading}
            onClick={(e) => {
              e.preventDefault()
              onSearch()
            }}
          >
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
            搜索
          </Button>
        </SidebarGroupContent>
      </SidebarGroup>
    </RightSidebar>
  )
}
