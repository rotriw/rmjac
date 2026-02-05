"use client"

import * as React from "react"
import { useState, useEffect, useCallback } from "react"
import {
  Sidebar,
  SidebarContent,
  useSidebar,
} from "@/components/ui/sidebar"

interface RightSidebarProps extends React.ComponentProps<typeof Sidebar> {
  /**
   * 默认宽度（像素）
   * @default 320
   */
  defaultWidth?: number
  /**
   * 最小宽度（像素）
   * @default 200
   */
  minWidth?: number
  /**
   * 最大宽度（像素）
   * @default 600
   */
  maxWidth?: number
  /**
   * 是否允许调整宽度
   * @default true
   */
  resizable?: boolean
  /**
   * 子组件（侧边栏内容）
   */
  children: React.ReactNode
}

/**
 * 统一的右侧边栏组件
 * 
 * 提供：
 * - 可调整宽度功能（可选）
 * - 响应式布局
 * - 统一的样式
 * 
 * @example
 * ```tsx
 * <RightSidebar defaultWidth={300} resizable>
 *   <SidebarGroup>
 *     <SidebarGroupLabel>标题</SidebarGroupLabel>
 *     <SidebarGroupContent>
 *       内容...
 *     </SidebarGroupContent>
 *   </SidebarGroup>
 * </RightSidebar>
 * ```
 */
export function RightSidebar({
  defaultWidth = 320,
  minWidth = 200,
  maxWidth = 600,
  resizable = true,
  children,
  className,
  style,
  ...props
}: RightSidebarProps) {
  const [width, setWidth] = useState(defaultWidth)
  const [isResizing, setIsResizing] = useState(false)
  const { isMobile } = useSidebar()

  const startResizing = useCallback(() => {
    setIsResizing(true)
  }, [])

  const stopResizing = useCallback(() => {
    setIsResizing(false)
  }, [])

  const resize = useCallback(
    (mouseMoveEvent: MouseEvent) => {
      if (isResizing) {
        const newWidth = window.innerWidth - mouseMoveEvent.clientX
        if (newWidth > minWidth && newWidth < maxWidth) {
          setWidth(newWidth)
        }
      }
    },
    [isResizing, minWidth, maxWidth]
  )

  useEffect(() => {
    if (!resizable) return

    window.addEventListener("mousemove", resize)
    window.addEventListener("mouseup", stopResizing)
    return () => {
      window.removeEventListener("mousemove", resize)
      window.removeEventListener("mouseup", stopResizing)
    }
  }, [resize, stopResizing, resizable])

  return (
    <Sidebar
      side="right"
      variant="sidebar"
      collapsible="none"
      className={`overflow-hidden border-l bg-sidebar lg:h-screen lg:sticky lg:top-0 transition-none w-full lg:w-auto ${className || ""}`}
      style={{ 
        width: !isMobile ? `${width}px` : undefined,
        ...style 
      }}
      {...props}
    >
      {resizable && !isMobile && (
        <div
          className="absolute left-0 top-0 w-1 h-full cursor-col-resize hover:bg-primary/30 transition-colors z-50"
          onMouseDown={startResizing}
        />
      )}
      <SidebarContent className="overflow-x-hidden">
        {children}
      </SidebarContent>
    </Sidebar>
  )
}
