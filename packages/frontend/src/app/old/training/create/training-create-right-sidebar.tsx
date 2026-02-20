"use client"

import * as React from "react"
import Link from "next/link"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarSeparator,
} from "@/components/ui/sidebar"
import { ArrowLeft, FileText, Eye, Edit3, Clock, Info } from "lucide-react"
import { RightSidebar } from "@/components/layout/right-sidebar"
import { Select, SelectItem } from "@/components/ui/select"
import { Label } from "@/components/ui/label"

interface TrainingCreateRightSidebarProps {
  mode: "simple" | "complex" | "import"
  viewMode: "form" | "preview"
  onViewModeChange: (mode: "form" | "preview") => void
  onModeChange: (mode: "simple" | "complex" | "import") => void
  formValues: {
    title?: string
    iden?: string
    start_time?: string
    end_time?: string
  }
}

export function TrainingCreateRightSidebar({
  mode,
  viewMode,
  onViewModeChange,
  onModeChange,
  formValues,
}: TrainingCreateRightSidebarProps) {
  const getModeLabel = (mode: string) => {
    switch (mode) {
      case "simple": return "简单模式"
      case "complex": return "复杂模式"
      case "import": return "导入模式"
      default: return mode
    }
  }

  return (
    <RightSidebar defaultWidth={320} minWidth={200} maxWidth={500}>
      {/* 视图切换 */}
      <SidebarGroup>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <SidebarMenuButton
                onClick={() => onViewModeChange(viewMode === "form" ? "preview" : "form")}
                className={`h-auto py-3 flex-col items-start gap-1 transition-all rounded-lg mx-1 border backdrop-blur-md ${
                  viewMode === "preview"
                    ? "bg-primary text-primary-foreground border-primary shadow-md hover:bg-primary/90 hover:text-white"
                    : "bg-white/5 dark:bg-white/5 border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 !text-sidebar-foreground"
                }`}
              >
                <div className="flex items-center justify-between w-full px-1">
                  <div className="flex items-center gap-2">
                    {viewMode === "preview" ? (
                      <Edit3 className="size-4 text-primary-foreground" />
                    ) : (
                      <Eye className="size-4 text-primary/80" />
                    )}
                    <span className="font-semibold text-xs">
                      {viewMode === "preview" ? "返回编辑" : "预览描述"}
                    </span>
                  </div>
                </div>
                <div className={`text-[10px] pl-7 font-medium ${viewMode === "preview" ? "text-primary-foreground/80" : "text-muted-foreground/80"}`}>
                  {viewMode === "preview" ? "点击编辑" : "点击预览Typst渲染效果"}
                </div>
              </SidebarMenuButton>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* 导航区域 */}
      <SidebarGroup>
        <SidebarGroupLabel>导航</SidebarGroupLabel>
        <SidebarGroupContent>
          <SidebarMenu>
            <SidebarMenuItem>
              <Link href="/training">
                <SidebarMenuButton className="h-auto py-3 flex-col items-start gap-1 bg-white/5 dark:bg-white/5 backdrop-blur-md border border-white/10 dark:border-white/10 hover:bg-white/10 dark:hover:bg-white/10 !text-sidebar-foreground hover:!text-sidebar-foreground transition-all rounded-lg">
                  <div className="flex items-center gap-2 px-1">
                    <ArrowLeft className="size-4 text-primary/80" />
                    <span className="font-semibold text-xs">返回训练列表</span>
                  </div>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          </SidebarMenu>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* 创建模式选择 */}
      <SidebarGroup>
        <SidebarGroupLabel>选择模式</SidebarGroupLabel>
        <SidebarGroupContent className="px-3 space-y-2">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">创建方式</Label>
            <Select
              value={mode}
              onValueChange={(value) => onModeChange(value as TrainingCreateRightSidebarProps["mode"])}
            >
              <SelectItem value="simple">简单模式 (快速导入题目)</SelectItem>
              <SelectItem value="complex">复杂模式 (后续编辑题目)</SelectItem>
              <SelectItem value="import">导入模式 (从外部网站导入)</SelectItem>
            </Select>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* 创建模式信息 */}
      <SidebarGroup>
        <SidebarGroupLabel>创建模式</SidebarGroupLabel>
        <SidebarGroupContent className="px-3 space-y-2">
          <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
            <div className="flex items-center gap-1.5 mb-1">
              <Info className="size-3.5 text-blue-600" />
              <span className="text-[10px] font-medium text-blue-700 dark:text-blue-400">当前模式</span>
            </div>
            <div className="text-sm font-bold text-blue-700 dark:text-blue-400">{getModeLabel(mode)}</div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* 训练信息预览 */}
      <SidebarGroup>
        <SidebarGroupLabel>训练信息</SidebarGroupLabel>
        <SidebarGroupContent className="px-3 space-y-3">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs">
              <FileText className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">标题：</span>
              <span className="font-medium truncate">{formValues.title || "未设置"}</span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <FileText className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">标识：</span>
              <span className="font-medium truncate">{formValues.iden || "未设置"}</span>
            </div>
          </div>

          {/* 时间信息 */}
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center gap-2 text-xs">
              <Clock className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">开始：</span>
              <span className="font-medium text-[11px]">
                {formValues.start_time ? new Date(formValues.start_time).toLocaleString() : "未设置"}
              </span>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <Clock className="size-3.5 text-muted-foreground" />
              <span className="text-muted-foreground">结束：</span>
              <span className="font-medium text-[11px]">
                {formValues.end_time ? new Date(formValues.end_time).toLocaleString() : "未设置"}
              </span>
            </div>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>

      <SidebarSeparator />

      {/* 帮助信息 */}
      <SidebarGroup>
        <SidebarGroupLabel>帮助</SidebarGroupLabel>
        <SidebarGroupContent className="px-3">
          <div className="text-xs text-muted-foreground space-y-2">
            <p>• 使用 Typst 语法编写公开描述</p>
            <p>• 点击预览按钮查看渲染效果</p>
            <p>• 简单模式可快速导入题目</p>
          </div>
        </SidebarGroupContent>
      </SidebarGroup>
    </RightSidebar>
  )
}
