/**
 * EdgeService 基类
 * 提供边缘服务的抽象基类，简化服务实现
 */

import type {
    Service,
    ServiceInfo,
    ServiceMetadata,
    ServiceOperation,
    Status,
    StatusDescribe,
    StatusDescribeData,
    StatusRequire,
    StatusRequireData,
    ValueType,
} from "./types.ts";
import { VjudgeStatus } from "./status.ts";

// ============================================================================
// StatusRequire 实现
// ============================================================================

/**
 * VjudgeStatusRequire 具体实现
 */
export class VjudgeStatusRequire implements StatusRequire {
    private requiredKeys: string[];

    constructor(requiredKeys: string[] = []) {
        this.requiredKeys = requiredKeys;
    }

    getRequiredKeys(): string[] {
        return this.requiredKeys;
    }

    verify(status: Status): boolean {
        // 检查必需的 key
        for (const key of this.requiredKeys) {
            if (status.getValue(key) === undefined) {
                return false;
            }
        }
        return true;
    }

    toJSON(): StatusRequireData {
        return {
            requiredKeys: this.requiredKeys,
        };
    }

    /**
     * 添加必需的 key
     */
    withRequiredKey(key: string): VjudgeStatusRequire {
        this.requiredKeys.push(key);
        return this;
    }

    /**
     * 添加必需的状态类型
     */
}

// ============================================================================
// StatusDescribe 实现
// ============================================================================

/**
 * VjudgeStatusDescribe 具体实现
 */
export class VjudgeStatusDescribe implements StatusDescribe {
    private key: string;
    private valueType: ValueType;

    constructor(key: string, valueType: ValueType) {
        this.key = key;
        this.valueType = valueType;
    }

    getKey(): string {
        return this.key;
    }

    getValueType(): ValueType {
        return this.valueType;
    }

    toJSON(): StatusDescribeData {
        return {
            key: this.key,
            valueType: this.valueType,
        };
    }
}

// ============================================================================
// EdgeService 抽象基类
// ============================================================================

/**
 * EdgeService 配置
 */
export interface EdgeServiceConfig {
    /** 服务名称 */
    name: string;
    /** 服务描述 */
    description: string;
    /** 平台名称 */
    platform: string;
    /** 操作类型 */
    operation: ServiceOperation;
    /** 方法名（可选） */
    method?: string;
    /** 服务代价 */
    cost?: number;
    /** 是否为终止服务 */
    isEnd?: boolean;
}

/**
 * EdgeService 抽象基类
 * 
 * 使用方法：
 * 1. 继承此类
 * 2. 实现 defineImportRequire() 定义输入要求
 * 3. 实现 defineExportDescribe() 定义输出描述
 * 4. 实现 doExecute() 执行服务逻辑
 */
export abstract class EdgeService implements Service {
    protected readonly config: Required<EdgeServiceConfig>;

    constructor(config: EdgeServiceConfig) {
        this.config = {
            name: config.name,
            description: config.description,
            platform: config.platform,
            operation: config.operation,
            method: config.method ?? "",
            cost: config.cost ?? 10,
            isEnd: config.isEnd ?? false,
        };
    }

    // ============================================================================
    // Service 接口实现
    // ============================================================================

    isEnd(): boolean {
        return this.config.isEnd;
    }

    getInfo(): ServiceInfo {
        return {
            name: this.config.name,
            description: this.config.description,
            allow_description: `${this.config.platform}:${this.config.operation}:${this.config.method}`,
        };
    }

    getCost(): number {
        return this.config.cost;
    }

    getImportRequire(): StatusRequire {
        return this.defineImportRequire();
    }

    getExportDescribe(): StatusDescribe[] {
        return this.defineExportDescribe();
    }

    async verify(input: Status): Promise<boolean> {
        return this.getImportRequire().verify(input);
    }

    async execute(input: Status): Promise<Status> {
        try {
            // 验证输入
            if (!await this.verify(input)) {
                return VjudgeStatus.error(`Service ${this.config.name}: Input verification failed`);
            }
            
            // 执行服务逻辑
            return await this.doExecute(input);
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            return VjudgeStatus.error(`Service ${this.config.name}: ${message}`);
        }
    }

    // ============================================================================
    // 子类需要实现的抽象方法
    // ============================================================================

    /**
     * 定义输入要求
     */
    protected abstract defineImportRequire(): StatusRequire;

    /**
     * 定义输出描述
     */
    protected abstract defineExportDescribe(): StatusDescribe[];

    /**
     * 执行服务逻辑
     * @param input 已验证的输入状态
     * @returns 输出状态
     */
    protected abstract doExecute(input: Status): Promise<Status>;

    // ============================================================================
    // 便捷方法
    // ============================================================================

    /**
     * 获取服务的唯一标识符
     */
    getServiceKey(): string {
        return `${this.config.platform}:${this.config.operation}:${this.config.method}`;
    }

    /**
     * 获取服务元数据（用于注册）
     */
    getMetadata(): ServiceMetadata {
        return {
            name: this.config.name,
            description: this.config.description,
            allow_description: this.getInfo().allow_description,
            source: "", // 可选：可以添加源代码链接或其他信息
            import_require: JSON.stringify(this.getImportRequire().toJSON()),
            export_describe: JSON.stringify(this.getExportDescribe().map(d => d.toJSON())),
        };
    }

    /**
     * 获取平台名称
     */
    getPlatform(): string {
        return this.config.platform;
    }

    /**
     * 获取操作类型
     */
    getOperation(): ServiceOperation {
        return this.config.operation;
    }

    /**
     * 获取方法名
     */
    getMethod(): string {
        return this.config.method;
    }
}

// ============================================================================
// 便捷工厂函数
// ============================================================================

/**
 * 创建 StatusRequire
 */
export function statusRequire(
    requiredKeys: string[] = []
): VjudgeStatusRequire {
    return new VjudgeStatusRequire(requiredKeys);
}

/**
 * 创建 StatusDescribe
 */
export function statusDescribe(key: string, valueType: ValueType): VjudgeStatusDescribe {
    return new VjudgeStatusDescribe(key, valueType);
}
