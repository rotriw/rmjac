import { Saved, Event, Difficulty } from "@rmjac/api-declare"

// ==================== Tracker 类型定义 ====================

/** 精简的题目信息（不含 description 等大字段） */
export interface ProblemBrief {
  id: number
  name: string
  sign: string | null
  platform: string
  difficulty?: Difficulty
}

/** 一个事件行：对应表格的一行（一个 contest/problemset） */
export interface TrackerEventRow {
  /** 事件 iden（如 "codeforces/1923"） */
  iden: string
  /** 事件数据 */
  event: Saved<Event>
  /** 该事件下的题目列表：[ProblemBrief, iden_suffix] */
  problems: [ProblemBrief, string][]
}

/** 单格状态 */
export interface TrackerCellStatus {
  passed: boolean
  score?: number
  submitCount?: number
  /** 数据来源 */
  source: "local" | "remote"
}

/** 用户标识：本地用户 or 远程 handle */
export type TrackerUser =
  | { type: "local"; userId: number; name: string }
  | { type: "remote"; platform: "codeforces" | "atcoder"; handle: string }

/** 完整 status matrix: userId/handle → problemIden → CellStatus */
export type StatusMatrix = Map<string, Map<string, TrackerCellStatus>>

/** 将 TrackerUser 转为 matrix key */
export function userKey(user: TrackerUser): string {
  if (user.type === "local") return `local:${user.userId}`
  return `${user.platform}:${user.handle}`
}

/** 将 TrackerUser 转为显示名 */
export function userDisplayName(user: TrackerUser): string {
  if (user.type === "local") return user.name
  return `${user.handle} (${user.platform})`
}
