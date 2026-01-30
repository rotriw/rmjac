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
import { Select, SelectItem } from "@/components/ui/select"
import { Search as SearchIcon, Loader2, FolderSearch } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { ProblemSearch } from "@/api-components/problem/problem-search"
import { RightSidebar } from "@/components/layout/right-sidebar"

interface Filters {
  user: string;
  problem: string;
  status: string;
}

interface RecordRightSidebarProps {
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
}: RecordRightSidebarProps) {
  return (
    <RightSidebar defaultWidth={300} minWidth={250} maxWidth={500}>
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
    </RightSidebar>
  )
}
