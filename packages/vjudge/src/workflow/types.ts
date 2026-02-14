/**
 * VJudge Workflow Types
 * 与 Rust packages/core/src/workflow/vjudge/ 保持一致
 */

import type { WorkflowStatusDataDTO } from "@rmjac/api-declare/interface/WorkflowStatusDataDTO.ts";
import type { WorkflowValueDTO } from "@rmjac/api-declare/interface/WorkflowValueDTO.ts";
import type { BaseValue as WorkflowBaseValue } from "@rmjac/api-declare/interface/BaseValue.ts";
import type { WorkflowStatus as WorkflowStatusGenerated } from "@rmjac/api-declare/interface/WorkflowStatus.ts";
import type { WorkflowValue as WorkflowValueGenerated } from "@rmjac/api-declare/interface/WorkflowValue.ts";
import type { WorkflowValueError as WorkflowValueErrorGenerated } from "@rmjac/api-declare/interface/WorkflowValueError.ts";
import type { WorkflowValues as WorkflowValuesGenerated } from "@rmjac/api-declare/interface/WorkflowValues.ts";

// ============================================================================
// Status 相关类型
// ============================================================================

/**
 * 状态接口（对应 Rust Status trait）
 */
export interface Status {
  /**
   * 获取状态字符串表示
   */
  getStatus(): string;

  /**
   * 获取指定 key 的值
   */
  getValue(key: string): WorkflowValueDTO | undefined;

  /**
   * 获取所有 key
   */
  getKeys(): string[];

  /**
   * 转换为可序列化的 JSON 对象
   */
  toJSON(): StatusData;
}

/**
 * 状态数据的 JSON 表示
 */
export type StatusData = WorkflowStatusDataDTO;

export function readStringValue(value?: WorkflowValueDTO): string | undefined {
  if (!value) return undefined;
  if (value.type === "String" || value.type === "Inner") {
    return value.value;
  }
  return undefined;
}

// ============================================================================
// StatusRequire 相关类型
// ============================================================================

/**
 * 状态要求接口（对应 Rust StatusRequire trait）
 */
export interface StatusRequire {
  /**
   * 获取必需的 key 列表
   */
  getRequiredKeys(): string[];
  
  /**
   * 验证状态是否满足要求
   */
  verify(status: Status): boolean;
  
  /**
   * 转换为 JSON
   */
  toJSON(): StatusRequireData;
}

/**
 * StatusRequire 的 JSON 表示
 */
export interface StatusRequireData {
  requiredKeys: string[];
}

// ============================================================================
// StatusDescribe 相关类型
// ============================================================================

/**
 * 值类型描述
 */
export type ValueType = "String" | "Number" | "Int" | "Bool" | "List";

/**
 * 状态描述接口（对应 Rust StatusDescribe trait）
 */
export interface StatusDescribe {
  /**
   * 获取 key 名称
   */
  getKey(): string;
  
  /**
   * 获取值类型
   */
  getValueType(): ValueType;
  
  /**
   * 转换为 JSON
   */
  toJSON(): StatusDescribeData;
}

/**
 * StatusDescribe 的 JSON 表示
 */
export interface StatusDescribeData {
  key: string;
  valueType: ValueType;
}

// ============================================================================
// Service 相关类型
// ============================================================================

/**
 * 服务信息（对应 Rust ServiceInfo）
 */
export interface ServiceInfo {
  name: string;
  description: string;
  allow_description: string;
}

/**
 * 服务操作类型
 */
export type ServiceOperation = "verify" | "syncList" | "syncOne" | "submit" | "fetch" | "query";

/**
 * 服务接口（对应 Rust Service trait）
 */
export interface Service {
  /**
   * 是否为终止服务
   */
  isEnd(): boolean;
  
  /**
   * 获取服务信息
   */
  getInfo(): ServiceInfo;
  
  /**
   * 获取服务代价（用于路径规划）
   */
  getCost(): number;
  
  /**
   * 获取输入要求
   */
  getImportRequire(): StatusRequire;
  
  /**
   * 获取输出描述
   */
  getExportDescribe(): StatusDescribe[];
  
  /**
   * 验证输入是否满足要求
   */
  verify(input: Status): Promise<boolean>;
  
  /**
   * 执行服务
   */
  execute(input: Status): Promise<Status>;
}

/**
 * 服务元数据的 JSON 表示（用于服务注册）
 */
export interface ServiceMetadata {
  name: string;
  description: string;
  allowDescription: string;
  source: string;
  importRequire: StatusRequireData;
  exportDescribe: StatusDescribeData[];
  platform: string;
  operation: ServiceOperation;
  method: string;
  cost: number;
  isEnd: boolean;
}

// ============================================================================
// Task 相关类型
// ============================================================================

/**
 * 任务状态（对应 Rust TaskStatus）
 */
export type TaskStatusType = "NotStart" | "Running" | "Success" | "Failed" | "NoMethod" | "Cancelled" | string;

/**
 * 任务请求（从服务器发送到边缘服务）
 */
export interface TaskRequest {
  taskId: string;
  serviceName: string;
  /** 兼容旧字段（新协议不再要求） */
  platform?: string;
  operation?: ServiceOperation;
  method?: string;
  input: WorkflowValuesData;
  timeout?: number;
  /** 任务历史 (Workflow NowStatus.history_value) */
  history?: unknown[];
  /** 任务当前状态 */
  taskStatus?: TaskStatusType;
}

/**
 * 任务响应（从边缘服务返回到服务器）
 */
export interface TaskResponse {
  taskId: string;
  success: boolean;
  output?: WorkflowValuesData;
  error?: string;
  /** 任务状态 */
  status?: TaskStatusType;
}

// ============================================================================
// 服务注册相关类型
// ============================================================================

/**
 * 服务注册消息
 */
export interface ServiceRegistrationMessage {
  services: ServiceMetadata[];
}

/**
 * 服务注销消息
 */
export interface ServiceUnregistrationMessage {
  serviceNames: string[];
}

// ============================================================================
// Socket 事件类型
// ============================================================================

/**
 * 服务器 -> 边缘服务 事件
 */
export interface ServerToEdgeEvents {
  workflow_task: (request: TaskRequest, callback: (response: TaskResponse) => void) => void;
}

/**
 * 边缘服务 -> 服务器 事件
 */
export interface EdgeToServerEvents {
  workflow_service_register: (message: ServiceRegistrationMessage) => void;
  workflow_service_unregister: (message: ServiceUnregistrationMessage) => void;
}

// ============================================================================
// 新 Workflow Value 类型系统 (与 Rust workflow::value / workflow::status 对齐)
// ============================================================================

/**
 * 基础值类型（对应 Rust BaseValue）
 */
export type BaseValue = WorkflowBaseValue;

/**
 * 带信任标记的值（对应 Rust WorkflowValue）
 */
export type WorkflowTrustValue = WorkflowValueGenerated;

/**
 * Workflow 值错误类型（对应 Rust WorkflowValueError）
 */
export type WorkflowValueError = WorkflowValueErrorGenerated;

/**
 * WorkflowValue 工具函数
 */
export const WorkflowValueUtils = {
  /** 创建不可信值 */
  untrusted(value: BaseValue): WorkflowTrustValue {
    return { trust: "Untrusted", ...value };
  },

  /** 创建可信值 */
  trusted(value: BaseValue, source?: string): WorkflowTrustValue {
    return { trust: "Trusted", source: source ?? null, ...value };
  },

  /** 检查是否为可信值 */
  isTrusted(value: WorkflowTrustValue): boolean {
    return value.trust === "Trusted";
  },

  /** 获取内部基础值 */
  inner(value: WorkflowTrustValue): BaseValue {
    const { trust: _, source: _s, ...base } = value as any;
    return base as BaseValue;
  },

  /** 将不可信值提升为可信值 */
  promote(value: WorkflowTrustValue, source: string): WorkflowTrustValue {
    if (value.trust === "Trusted") return value;
    const { trust: _, ...base } = value as any;
    return { trust: "Trusted", source, ...base };
  },
} as const;

/**
 * BaseValue 工具函数
 */
export const BaseValueUtils = {
  string(value: string): BaseValue {
    return { type: "String", value };
  },
  number(value: number): BaseValue {
    return { type: "Number", value };
  },
  int(value: number): BaseValue {
    return { type: "Int", value: Math.floor(value) };
  },
  bool(value: boolean): BaseValue {
    return { type: "Bool", value };
  },
  list(value: BaseValue[]): BaseValue {
    return { type: "List", value };
  },
  object(value: Record<string, unknown>): BaseValue {
    return { type: "Object", value };
  },
  null(): BaseValue {
    return { type: "Null" };
  },

  /** 从原始 JS 值创建 BaseValue */
  from(value: unknown): BaseValue {
    if (value === null || value === undefined) return { type: "Null" };
    if (typeof value === "string") return { type: "String", value };
    if (typeof value === "number") {
      return Number.isInteger(value)
        ? { type: "Int", value: Math.floor(value) as unknown as bigint }
        : { type: "Number", value };
    }
    if (typeof value === "bigint") return { type: "Int", value };
    if (typeof value === "boolean") return { type: "Bool", value };
    if (Array.isArray(value)) {
      return { type: "List", value: value.map(BaseValueUtils.from) };
    }
    if (typeof value === "object") {
      return { type: "Object", value: value as Record<string, unknown> };
    }
    return { type: "String", value: String(value) };
  },
} as const;

/**
 * 值集合（对应 Rust WorkflowValues）
 */
export type WorkflowValuesData = WorkflowValuesGenerated;

/**
 * Workflow 状态（对应 Rust WorkflowStatus）
 */
export type WorkflowStatusType = WorkflowStatusGenerated;

/**
 * WorkflowValues 工具函数
 * 
 * 提供与 Rust WorkflowValues 对齐的辅助方法
 */
export const WorkflowValuesUtils = {
  /** 创建空的 Values 集合 */
  empty(): WorkflowValuesData {
    return { kind: "Values", inner: {} };
  },

  /** 创建 Final(Failed) 状态 */
  finalFailed(error: string, context?: unknown): WorkflowValuesData {
    return { kind: "Final", inner: { Failed: { error, context: context ?? null } } };
  },

  /** 创建 Final(Completed) 状态 */
  finalCompleted(values: WorkflowValuesData, message?: string): WorkflowValuesData {
    return { kind: "Final", inner: { Completed: { values, message: message ?? null } } };
  },

  /** 创建 Final(Running) 状态 */
  finalRunning(values: WorkflowValuesData): WorkflowValuesData {
    return { kind: "Final", inner: { Running: values } };
  },

  /** 判断是否为 Final 变体 */
  isFinal(values: WorkflowValuesData): boolean {
    return values.kind === "Final";
  },

  /** 判断是否为 Final(Failed) 状态 */
  isFailedFinal(values: WorkflowValuesData): boolean {
    return values.kind === "Final" && "Failed" in values.inner;
  },

  /** 判断是否为 Final(Completed) 状态 */
  isCompletedFinal(values: WorkflowValuesData): boolean {
    return values.kind === "Final" && "Completed" in values.inner;
  },

  /** 导出任务执行状态（对应 Rust Status::export_task_status） */
  exportTaskStatus(values: WorkflowValuesData): string {
    if (values.kind === "Values") return "running";
    const inner = values.inner;
    if ("Failed" in inner) return "failed";
    if ("Completed" in inner) return "completed";
    return "running";
  },

  /** 获取 Final(Failed) 的错误信息 */
  finalError(values: WorkflowValuesData): string | undefined {
    if (values.kind === "Final" && "Failed" in values.inner) {
      return values.inner.Failed.error;
    }
    return undefined;
  },

  /** 获取 Final 状态 */
  getFinalStatus(values: WorkflowValuesData): WorkflowStatusType | undefined {
    if (values.kind === "Final") {
      return values.inner;
    }
    return undefined;
  },
} as const;

// ============================================================================
// VjudgeNode 相关类型（迁移至 Rust 生成类型）
// ============================================================================
