"use client"

import * as React from "react"
import { useState } from "react"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  useSidebar,
} from "@/components/ui/sidebar"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Select, SelectItem } from "@/components/ui/select"
import { Search as SearchIcon, Loader2, FolderSearch } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProblemSearch } from "@/api-components/problem/problem-search"

interface Filters {
  user: string;
  problem: string;
  status: string;
}

interface RecordRightSidebarProps extends React.ComponentProps<typeof Sidebar> {
  filters: Filters;
  setFilters: (filters: Filters) => void;
  onSearch: () => void;
  loading: boolean;
  total: number;
}

export function RecordRightSidebar({
  filters,
  setFilters,
  onSearch,
  loading,
  total,
  ...props
}: RecordRightSidebarProps) {
  const [width, setWidth] = useState(300)
  const [isResizing, setIsResizing] = useState(false)
  const { isMobile } = useSidebar()

  const startResizing = React.useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = React.useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = React.useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX
        if (newWidth > 250 && newWidth < 500) {
          setWidth(newWidth)
        }
      }
    },
    [isResizing]
  )

  React.useEffect(() => {
    window.addEventListener("mousemove", resize)
    window.addEventListener("mouseup", stopResizing)
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [resize, stopResizing])

  return (
    <Sidebar
      side="right"
      variant="sidebar"
      collapsible="none"
      className="border-l bg-sidebar lg:h-screen lg:sticky lg:top-0 transition-none w-full lg:w-auto"
      style={{ width: !isMobile ? `${width}px` : undefined }}
      {...props}
    >
      {!isMobile && (
        <div
          className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-50"
          onMouseDown={startResizing}
        />
      )}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>搜索筛选</SidebarGroupLabel>
          <SidebarGroupContent className="p-4 space-y-6">
            <div className="flex items-center justify-between px-1">
              <span className="text-sm font-medium opacity-60">记录总数</span>
              <span className="text-sm font-bold">{total}</span>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">用户 (ID 或 Iden)</Label>
              <Input
                placeholder="用户 ID 或 Iden"
                value={filters.user}
                onChange={(e) => setFilters({ ...filters, user: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">题目 (ID 或 Iden)</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="题目 ID 或 Iden"
                  value={filters.problem}
                  onChange={(e) => setFilters({ ...filters, problem: e.target.value })}
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="icon" title="搜索题目">
                      <FolderSearch className="h-4 w-4" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[300px] p-0" align="end">
                    <ProblemSearch onSelect={(node) => {
                      setFilters({ ...filters, problem: node.id })
                      // We can't easily close the popover from here without controlled state, 
                      // but clicking outside works. 
                      // To auto-close, we would need to control the Popover open state.
                    }} />
                  </PopoverContent>
                </Popover>
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">状态</Label>
              <Select
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              >
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="100">Accepted</SelectItem>
                <SelectItem value="200">Wrong Answer</SelectItem>
                <SelectItem value="301">Time Limit Exceeded</SelectItem>
                <SelectItem value="302">Memory Limit Exceeded</SelectItem>
                <SelectItem value="303">Output Limit Exceeded</SelectItem>
                <SelectItem value="304">Idleness Limit Exceeded</SelectItem>
                <SelectItem value="400">Runtime Error</SelectItem>
                <SelectItem value="500">Compile Error</SelectItem>
                <SelectItem value="501">Dangerous Code</SelectItem>
                <SelectItem value="800">Waiting</SelectItem>
              </Select>
            </div>

            <Button
              variant="ghost"
              className="w-full border"
              disabled={loading}
              onClick={(e) => {
                e.preventDefault();
                onSearch();
              }}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <SearchIcon className="mr-2 h-4 w-4" />}
              搜索
            </Button>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}