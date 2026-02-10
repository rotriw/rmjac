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
 * 注意：后端 API 已更新为 snake_case 并且要求 import_require/export_describe 为字符串描述
 */
export interface ServiceMetadata {
  name: string;
  description: string;
  allow_description: string;
  source: string;
  import_require: string;
  export_describe: string;
  // 保留旧字段用于内部逻辑或兼容性，或者如果后端不再需要则移除
  // 这里根据用户提供的 JSON 样例，后端似乎不再关注 platform/operation/method 的细分，而是通过 name/allow_description 识别
}

// ============================================================================
// Task 相关类型
// ============================================================================

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
  input: StatusData;
  timeout?: number;
  /** 任务历史 (Workflow NowStatus.history_value) */
  history?: unknown[]; 
}

/**
 * 任务响应（从边缘服务返回到服务器）
 */
export interface TaskResponse {
  taskId: string;
  success: boolean;
  output?: StatusData;
  error?: string;
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
    return { type: "Int", value: BigInt(Math.floor(value)) };
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
        ? { type: "Int", value: BigInt(Math.floor(value)) }
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

// ============================================================================
// VjudgeNode 相关类型（迁移至 Rust 生成类型）
// ============================================================================
