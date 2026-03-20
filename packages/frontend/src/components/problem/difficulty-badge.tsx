"use client"

import { Badge } from "@/components/ui/badge"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import {
  getRatingColor,
  getRatingRangeLabel,
  RATING_COLOR_MAP,
  RATING_BG_COLOR_MAP,
  type RatingColor,
} from "@/lib/difficulty-colors"
import { cn } from "@/lib/utils"

type DifficultyValue =
  | { NumberStyle: number }
  | { LuoguStyle: string }
  | "None"
  | null
  | undefined

interface DifficultyBadgeProps {
  /** 难度值，支持 NumberStyle / LuoguStyle / "None" / null */
  difficulty: DifficultyValue
  /** 额外的 className */
  className?: string
  /** 是否显示 tooltip（默认 true） */
  showTooltip?: boolean
  /** 尺寸：sm 用于表格行内，默认为 default */
  size?: "sm" | "default"
}

/**
 * 获取 NumberStyle rating 数值
 */
function getNumberRating(d: DifficultyValue): number | null {
  if (!d || d === "None") return null
  if (typeof d === "object" && "NumberStyle" in d) return d.NumberStyle
  return null
}

/**
 * 获取难度文本标签
 */
function getDifficultyText(d: DifficultyValue): string | null {
  if (!d || d === "None") return null
  if (typeof d === "object" && "LuoguStyle" in d) return d.LuoguStyle
  if (typeof d === "object" && "NumberStyle" in d) return String(d.NumberStyle)
  return null
}

/**
 * 题目难度 Badge 组件
 * 
 * 按照 kenkoooo (AtCoder Problems) 的规则根据 rating 染色：
 * - 灰(0-399) 棕(400-799) 绿(800-1199) 青(1200-1599)
 * - 蓝(1600-1999) 黄(2000-2399) 橙(2400-2799) 红(2800+)
 */
export function DifficultyBadge({
  difficulty,
  className,
  showTooltip = true,
  size = "default",
}: DifficultyBadgeProps) {
  const text = getDifficultyText(difficulty)
  if (!text) return null

  const rating = getNumberRating(difficulty)
  const color: RatingColor | null = rating !== null ? getRatingColor(rating) : null
  const colorHex = color ? RATING_COLOR_MAP[color] : undefined
  const bgColor = color ? RATING_BG_COLOR_MAP[color] : undefined

  const sizeClasses = size === "sm" ? "text-[10px] px-1.5 py-0 h-4" : "text-xs px-2 py-0.5"

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        "font-mono font-semibold border-transparent",
        sizeClasses,
        className,
      )}
      style={{
        color: colorHex,
        backgroundColor: bgColor,
        borderColor: colorHex ? `${colorHex}30` : undefined,
      }}
    >
      {/* 色圆点 */}
      {colorHex && (
        <span
          className="inline-block rounded-full mr-1"
          style={{
            width: size === "sm" ? 6 : 8,
            height: size === "sm" ? 6 : 8,
            backgroundColor: colorHex,
          }}
        />
      )}
      {text}
    </Badge>
  )

  if (!showTooltip || !color || rating === null) return badge

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{badge}</TooltipTrigger>
        <TooltipContent>
          <p className="text-xs">
            Difficulty {rating} · {getRatingRangeLabel(color)}
          </p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  )
}
