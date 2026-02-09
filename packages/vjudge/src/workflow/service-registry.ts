/**
 * ServiceRegistry - 服务注册器
 * 管理边缘服务的注册、注销和任务分发
 */

import type { Socket } from "socket.io-client";
import type {
  Service,
  ServiceMetadata,
  ServiceRegistrationMessage,
  ServiceUnregistrationMessage,
  TaskRequest,
  TaskResponse,
} from "./types.ts";
import { VjudgeStatus } from "./status.ts";
import { EdgeService } from "./service-base.ts";

/**
 * ServiceRegistry 配置
 */
export interface ServiceRegistryConfig {
  /** 日志记录器（可选） */
  logger?: {
    info: (message: string) => void;
    warn: (message: string) => void;
    error: (message: string) => void;
    debug: (message: string) => void;
  };
}

/**
 * ServiceRegistry
 * 负责管理边缘服务的注册、任务分发和与服务器的通信
 */
export class ServiceRegistry {
  private services: Map<string, Service> = new Map();
  private socket: Socket | null = null;
  private config: ServiceRegistryConfig;
  private isConnected: boolean = false;

  constructor(config: ServiceRegistryConfig = {}) {
    this.config = config;
  }

  // ============================================================================
  // Socket 连接管理
  // ============================================================================

  /**
   * 绑定 Socket.IO 连接
   */
  bindSocket(socket: Socket): void {
    this.socket = socket;
    this.isConnected = socket.connected;
    this.setupEventHandlers();
    this.log("info", `Socket bound to ServiceRegistry, connected=${this.isConnected}, services=${this.services.size}`);

    // 如果 socket 已经连接（首次 auth 成功后 bind 的情况），立即注册服务
    // 因为此时 on("connect") 不会再触发，必须手动调用
    if (this.isConnected && this.services.size > 0) {
      this.log("info", "Socket already connected, registering services now...");
      this.registerAllServices();
    }
  }

  /**
   * 设置事件处理器
   */
  private setupEventHandlers(): void {
    if (!this.socket) return;

    // 监听工作流任务请求
    this.socket.on("workflow_task", async (request: TaskRequest, callback: (response: TaskResponse) => void) => {
      const startTime = Date.now();
      this.log("info", `[workflow_task] === RECEIVED === taskId=${request.taskId}, serviceName=${request.serviceName}, platform=${request.platform}, operation=${request.operation}, method=${request.method}`);
      this.log("debug", `[workflow_task] Input: ${JSON.stringify(request.input).substring(0, 500)}`);
      this.log("info", `[workflow_task] Registered services: [${Array.from(this.services.keys()).join(", ")}]`);
      try {
        const response = await this.handleTask(request);
        const elapsed = Date.now() - startTime;
        this.log("info", `[workflow_task] handleTask completed: success=${response.success}, elapsed=${elapsed}ms, hasOutput=${!!response.output}, error=${response.error || "none"}`);
        if (response.output) {
          this.log("debug", `[workflow_task] Output: ${JSON.stringify(response.output).substring(0, 500)}`);
        }
        this.log("info", `[workflow_task] Calling callback with response...`);
        callback(response);
        this.log("info", `[workflow_task] Callback called successfully for task ${request.taskId}`);
      } catch (err) {
        const elapsed = Date.now() - startTime;
        const message = err instanceof Error ? err.message : String(err);
        this.log("error", `[workflow_task] UNCAUGHT ERROR after ${elapsed}ms: ${message}`);
        this.log("error", `[workflow_task] Stack: ${err instanceof Error ? err.stack : "N/A"}`);
        const errorResponse: TaskResponse = {
          taskId: request.taskId,
          success: false,
          error: `Uncaught error: ${message}`,
        };
        callback(errorResponse);
      }
    });

    // 监听连接成功事件
    this.socket.on("connect", () => {
      this.isConnected = true;
      this.log("info", "Connected to server, registering services...");
      this.registerAllServices();
    });

    // 监听断开连接事件
    this.socket.on("disconnect", () => {
      this.isConnected = false;
      this.log("warn", "Disconnected from server");
    });
  }

  // ============================================================================
  // 服务管理
  // ============================================================================

  /**
   * 注册服务
   */
  register(service: Service): void {
    const key = this.getServiceKey(service);
    this.services.set(key, service);
    this.log("info", `Registered service: ${service.getInfo().name} (${key})`);

    // 如果已连接，立即通知服务器
    if (this.isConnected && this.socket) {
      const message: ServiceRegistrationMessage = {
        services: [this.getServiceMetadata(service)],
      };
      this.socket.emit("workflow_service_register", message);
    }
  }

  /**
   * 批量注册服务
   */
  registerAll(services: Service[]): void {
    for (const service of services) {
      const key = this.getServiceKey(service);
      this.services.set(key, service);
      this.log("info", `Registered service: ${service.getInfo().name} (${key})`);
    }

    // 如果已连接，批量通知服务器
    if (this.isConnected && this.socket) {
      const message: ServiceRegistrationMessage = {
        services: services.map(s => this.getServiceMetadata(s)),
      };
      this.socket.emit("workflow_service_register", message);
    }
  }

  /**
   * 注销服务
   */
  unregister(serviceName: string): boolean {
    const deleted = this.services.delete(serviceName);
    if (deleted) {
      this.log("info", `Unregistered service: ${serviceName}`);

      // 通知服务器
      if (this.isConnected && this.socket) {
        const message: ServiceUnregistrationMessage = {
          serviceNames: [serviceName],
        };
        this.socket.emit("workflow_service_unregister", message);
      }
    }
    return deleted;
  }

  /**
   * 获取所有已注册的服务
   */
  getServices(): Service[] {
    return Array.from(this.services.values());
  }

  /**
   * 根据 key 获取服务
   */
  getService(key: string): Service | undefined {
    return this.services.get(key);
  }

  /**
   * 检查服务是否存在
   */
  hasService(key: string): boolean {
    return this.services.has(key);
  }

  /**
   * 获取已注册服务数量
   */
  getServiceCount(): number {
    return this.services.size;
  }

  // ============================================================================
  // 任务处理
  // ============================================================================

  /**
   * 处理任务请求
   */
  async handleTask(request: TaskRequest): Promise<TaskResponse> {
    const { taskId, serviceName, platform, operation, method, input } = request;

    // 构建服务 key
    const key = `${platform}:${operation}:${method}`;
    this.log("info", `[handleTask] Looking up service key="${key}" for task ${taskId}`);
    this.log("debug", `[handleTask] All registered keys: [${Array.from(this.services.keys()).join(", ")}]`);
    const service = this.services.get(key);

    if (!service) {
      this.log("error", `[handleTask] Service not found: key="${key}". Available: [${Array.from(this.services.keys()).join(", ")}]`);
      return {
        taskId,
        success: false,
        error: `Service not found: ${key}`,
      };
    }

    const serviceInfo = service.getInfo();
    this.log("info", `[handleTask] Found service: name=${serviceInfo.name}, description=${serviceInfo.description}`);

    try {
      // 解析输入状态
      this.log("debug", `[handleTask] Parsing input status from JSON...`);
      const inputStatus = VjudgeStatus.fromJSON(input);
      this.log("info", `[handleTask] Input parsed: valueKeys=[${inputStatus.getKeys().join(", ")}]`);

      // 执行服务
      this.log("info", `[handleTask] Executing service: ${serviceName} (key=${key})...`);
      const execStart = Date.now();
      const outputStatus = await service.execute(inputStatus);
      const execElapsed = Date.now() - execStart;
      const errorValue = outputStatus.getValue("error_message") ?? outputStatus.getValue("error");
      const errorMessage = errorValue?.type === "String" ? errorValue.value : undefined;
      if (errorMessage) {
        this.log("warn", `[handleTask] Service returned error: ${errorMessage}`);
        return {
          taskId,
          success: false,
          error: errorMessage,
        };
      }

      const output = outputStatus.toJSON();
      this.log("info", `[handleTask] Task ${taskId} success`);
      return {
        taskId,
        success: true,
        output,
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.log("error", `[handleTask] Task ${taskId} execution failed: ${message}`);
      this.log("error", `[handleTask] Stack: ${error instanceof Error ? error.stack : "N/A"}`);
      return {
        taskId,
        success: false,
        error: message,
      };
    }
  }

  // ============================================================================
  // 辅助方法
  // ============================================================================

  /**
   * 注册所有服务到服务器
   */
  private registerAllServices(): void {
    if (!this.socket || this.services.size === 0) return;

    const services: ServiceMetadata[] = [];
    for (const service of this.services.values()) {
      services.push(this.getServiceMetadata(service));
    }

    const message: ServiceRegistrationMessage = { services };
    this.socket.emit("workflow_service_register", message);
    this.log("info", `Registered ${services.length} services to server`);
  }

  /**
   * 获取服务的唯一 key
   */
  private getServiceKey(service: Service): string {
    if (service instanceof EdgeService) {
      return service.getServiceKey();
    }
    // 对于非 EdgeService，使用服务名称
    return service.getInfo().name;
  }

  /**
   * 获取服务元数据
   */
  private getServiceMetadata(service: Service): ServiceMetadata {
    if (service instanceof EdgeService) {
      return service.getMetadata();
    }

    // 对于非 EdgeService，构建基本元数据
    const info = service.getInfo();
    return {
      name: info.name,
      description: info.description,
      allowDescription: info.allowDescription,
      platform: "unknown",
      operation: "verify",
      method: "",
      cost: service.getCost(),
      isEnd: service.isEnd(),
      importRequire: service.getImportRequire().toJSON(),
      exportDescribe: service.getExportDescribe().map(d => d.toJSON()),
    };
  }

  /**
   * 日志记录
   */
  private log(level: "info" | "warn" | "error" | "debug", message: string): void {
    if (this.config.logger) {
      this.config.logger[level](`[ServiceRegistry] ${message}`);
    } else if (typeof globalThis !== "undefined" && (globalThis as any).LOG) {
      (globalThis as any).LOG[level](`[ServiceRegistry] ${message}`);
    } else {
      console[level === "debug" ? "log" : level](`[ServiceRegistry] ${message}`);
    }
  }
}

/**
 * 创建 ServiceRegistry 单例
 */
let registryInstance: ServiceRegistry | null = null;

export function getServiceRegistry(config?: ServiceRegistryConfig): ServiceRegistry {
  if (!registryInstance) {
    registryInstance = new ServiceRegistry(config);
  }
  return registryInstance;
}

export function resetServiceRegistry(): void {
  registryInstance = null;
}
