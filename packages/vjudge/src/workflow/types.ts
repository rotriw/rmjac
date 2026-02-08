/**
 * VJudge Workflow Types
 * 与 Rust packages/core/src/workflow/vjudge/ 保持一致
 */

// ============================================================================
// Status 相关类型
// ============================================================================

/**
 * 状态类型枚举（对应 Rust VjudgeStatusType）
 */
export type VjudgeStatusType =
  | "Initial"
  | "AccountVerified"
  | "ProblemFetched"
  | "ProblemSynced"
  | "SubmissionCreated"
  | "SubmissionJudged"
  | "JudgePending"
  | "JudgeCompleted"
  | "Error"
  | "Completed";

/**
 * 值类型（对应 Rust VjudgeValue）
 */
export type VjudgeValue =
  | { type: "String"; value: string }
  | { type: "Number"; value: number }
  | { type: "Bool"; value: boolean }
  | { type: "List"; value: VjudgeValue[] };

/**
 * 状态接口（对应 Rust Status trait）
 */
export interface Status {
  /**
   * 获取状态字符串表示
   */
  getStatus(): string;
  
  /**
   * 获取状态类型
   */
  getStatusType(): VjudgeStatusType;
  
  /**
   * 获取指定 key 的值
   */
  getValue(key: string): VjudgeValue | undefined;
  
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
export interface StatusData {
  statusType: VjudgeStatusType;
  values: Record<string, VjudgeValue>;
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
  requiredStatusTypes?: VjudgeStatusType[];
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
  allowDescription: string;
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
  platform: string;
  operation: ServiceOperation;
  method: string;
  cost: number;
  isEnd: boolean;
  importRequire: StatusRequireData;
  exportDescribe: StatusDescribeData[];
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
  platform: string;
  operation: ServiceOperation;
  method: string;
  input: StatusData;
  timeout?: number;
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
// VjudgeNode 相关类型（来自现有 declare/node.ts）
// ============================================================================

export interface VjudgeNodePublic {
  iden: string;
  platform: string;
}

export interface VjudgeNodePrivate {
  auth: {
    Token?: string;
    Password?: string;
    Cookie?: string;
  };
}

export interface VjudgeNode {
  node_id: string;
  public: VjudgeNodePublic;
  private: VjudgeNodePrivate;
}
