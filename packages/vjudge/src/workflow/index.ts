/**
 * VJudge Workflow Module
 * 导出所有工作流相关的类型和实现
 */

// Types
export type {
  Status,
  StatusData,
  StatusRequire,
  StatusRequireData,
  StatusDescribe,
  StatusDescribeData,
  Service,
  ServiceInfo,
  ServiceMetadata,
  ServiceOperation,
  VjudgeStatusType,
  VjudgeValue,
  ValueType,
  TaskRequest,
  TaskResponse,
  ServiceRegistrationMessage,
  ServiceUnregistrationMessage,
  ServerToEdgeEvents,
  EdgeToServerEvents,
  VjudgeNode,
  VjudgeNodePublic,
  VjudgeNodePrivate,
} from "./types.ts";

// Status 实现
export { VjudgeStatus, createValue } from "./status.ts";

// Service 基类和辅助类
export {
  EdgeService,
  VjudgeStatusRequire,
  VjudgeStatusDescribe,
  statusRequire,
  statusDescribe,
  type EdgeServiceConfig,
} from "./service-base.ts";

// ServiceRegistry
export {
  ServiceRegistry,
  getServiceRegistry,
  resetServiceRegistry,
  type ServiceRegistryConfig,
} from "./service-registry.ts";
