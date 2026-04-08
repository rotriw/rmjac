/**
 * 题目难度颜色工具
 * 
 * 染色规则来自 kenkoooo (AtCoder Problems):
 *   Grey:   0 - 399
 *   Brown:  400 - 799
 *   Green:  800 - 1199
 *   Cyan:   1200 - 1599
 *   Blue:   1600 - 1999
 *   Yellow: 2000 - 2399
 *   Orange: 2400 - 2799
 *   Red:    2800+
 *
 * 颜色值使用 oklch 色彩空间以保持与现有网站风格一致。
 */

export type RatingColor =
  | "Grey"
  | "Brown"
  | "Green"
  | "Cyan"
  | "Blue"
  | "Yellow"
  | "Orange"
  | "Red"

export const RatingColors: readonly RatingColor[] = [
  "Grey",
  "Brown",
  "Green",
  "Cyan",
  "Blue",
  "Yellow",
  "Orange",
  "Red",
] as const

/**
 * 根据 rating 数值返回颜色名称（kenkoooo 规则）
 */
export function getRatingColor(rating: number): RatingColor {
  if (rating < 0) return "Grey"
  const index = Math.min(Math.floor(rating / 400), RatingColors.length - 1)
  return RatingColors[index]
}

/**
 * 浅色主题下的难度颜色 Hex 值（与 kenkoooo 一致）
 */
export const RATING_COLOR_MAP: Record<RatingColor, string> = {
  Grey:   "#808080",
  Brown:  "#804000",
  Green:  "#008000",
  Cyan:   "#00C0C0",
  Blue:   "#0000FF",
  Yellow: "#C0C000",
  Orange: "#FF8000",
  Red:    "#FF0000",
}

/**
 * 深色主题友好的难度颜色（提高亮度，与 kenkoooo dark theme 一致）
 */
export const RATING_COLOR_MAP_DARK: Record<RatingColor, string> = {
  Grey:   "#C0C0C0",
  Brown:  "#B08C56",
  Green:  "#3FAF3F",
  Cyan:   "#42E0E0",
  Blue:   "#8888FF",
  Yellow: "#FFFF56",
  Orange: "#FFB836",
  Red:    "#FF6767",
}

/**
 * 用于 Badge 背景的柔和色
 * 亮度更高、饱和度更低，适合作为 Badge 背景 + 深色文字
 */
export const RATING_BG_COLOR_MAP: Record<RatingColor, string> = {
  Grey:   "rgba(128, 128, 128, 0.15)",
  Brown:  "rgba(128, 64, 0, 0.15)",
  Green:  "rgba(0, 128, 0, 0.15)",
  Cyan:   "rgba(0, 192, 192, 0.15)",
  Blue:   "rgba(0, 0, 255, 0.15)",
  Yellow: "rgba(192, 192, 0, 0.15)",
  Orange: "rgba(255, 128, 0, 0.15)",
  Red:    "rgba(255, 0, 0, 0.15)",
}

/**
 * 获取 rating 对应的颜色 Hex
 */
export function getRatingColorHex(rating: number): string {
  return RATING_COLOR_MAP[getRatingColor(rating)]
}

/**
 * 获取难度的范围标签，如 "1600-1999"
 */
export function getRatingRangeLabel(color: RatingColor): string {
  switch (color) {
    case "Grey":   return "0-399"
    case "Brown":  return "400-799"
    case "Green":  return "800-1199"
    case "Cyan":   return "1200-1599"
    case "Blue":   return "1600-1999"
    case "Yellow": return "2000-2399"
    case "Orange": return "2400-2799"
    case "Red":    return "2800+"
  }
}

/**
 * 获取颜色的中文标签
 */
export function getRatingColorLabel(color: RatingColor): string {
  switch (color) {
    case "Grey":   return "灰"
    case "Brown":  return "棕"
    case "Green":  return "绿"
    case "Cyan":   return "青"
    case "Blue":   return "蓝"
    case "Yellow": return "黄"
    case "Orange": return "橙"
    case "Red":    return "红"
  }
}
