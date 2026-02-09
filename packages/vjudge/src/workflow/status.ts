/**
 * VJudge Status 实现
 */

import type {
  Status,
  StatusData,
  VjudgeValue,
  BaseValue,
  WorkflowValue,
  WorkflowValuesData,
  WorkflowStatusType,
} from "./types.ts";
import { WorkflowValueUtils, BaseValueUtils } from "./types.ts";

/**
 * VjudgeStatus 具体实现
 */
export class VjudgeStatus implements Status {
  private values: Map<string, VjudgeValue>;

  constructor() {
    this.values = new Map();
  }

  // ============================================================================
  // Status 接口实现
  // ============================================================================

  getStatus(): string {
    const entries = Array.from(this.values.entries())
      .map(([k, v]) => `${k}=${valueToString(v)}`)
      .join(", ");
    return `Status(${entries})`;
  }

  getValue(key: string): VjudgeValue | undefined {
    return this.values.get(key);
  }

  getKeys(): string[] {
    return Array.from(this.values.keys());
  }

  toJSON(): StatusData {
    const valuesObj: Record<string, VjudgeValue> = {};
    for (const [key, value] of this.values) {
      valuesObj[key] = value;
    }
    return {
      values: valuesObj,
    };
  }

  // ============================================================================
  // 构建器方法
  // ============================================================================

  /**
   * 设置字符串值
   */
  withString(key: string, value: string): VjudgeStatus {
    this.values.set(key, { type: "String", value });
    return this;
  }

  /**
   * 设置数字值
   */
  withNumber(key: string, value: number): VjudgeStatus {
    this.values.set(key, { type: "Number", value });
    return this;
  }

  /**
   * 设置整数值（别名，与 withNumber 相同）
   */
  withInt(key: string, value: number): VjudgeStatus {
    this.values.set(key, { type: "Number", value: Math.floor(value) });
    return this;
  }

  /**
   * 设置布尔值
   */
  withBool(key: string, value: boolean): VjudgeStatus {
    this.values.set(key, { type: "Bool", value });
    return this;
  }

  /**
   * 设置列表值
   */
  withList(key: string, value: VjudgeValue[]): VjudgeStatus {
    this.values.set(key, { type: "List", value });
    return this;
  }

  /**
   * 设置任意值
   */
  withValue(key: string, value: VjudgeValue): VjudgeStatus {
    this.values.set(key, value);
    return this;
  }

  // ============================================================================
  // 便捷获取方法
  // ============================================================================

  /**
   * 获取字符串值
   */
  getString(key: string): string | undefined {
    const value = this.values.get(key);
    if (value?.type === "String") {
      return value.value;
    }
    return undefined;
  }

  /**
   * 获取数字值
   */
  getNumber(key: string): number | undefined {
    const value = this.values.get(key);
    if (value?.type === "Number") {
      return value.value;
    }
    return undefined;
  }

  /**
   * 获取布尔值
   */
  getBool(key: string): boolean | undefined {
    const value = this.values.get(key);
    if (value?.type === "Bool") {
      return value.value;
    }
    return undefined;
  }

  /**
   * 获取列表值
   */
  getList(key: string): VjudgeValue[] | undefined {
    const value = this.values.get(key);
    if (value?.type === "List") {
      return value.value;
    }
    return undefined;
  }

  // ============================================================================
  // 静态工厂方法
  // ============================================================================

  /**
   * 从 JSON 数据创建
   */
  static fromJSON(data: StatusData): VjudgeStatus {
    const status = new VjudgeStatus();
    for (const [key, value] of Object.entries(data.values)) {
      status.values.set(key, value);
    }
    return status;
  }

  /**
   * 创建初始状态
   */
  static initial(): VjudgeStatus {
    return new VjudgeStatus();
  }

  /**
   * 创建错误状态
   */
  static error(message: string): VjudgeStatus {
    return new VjudgeStatus().withString("error_message", message);
  }

  /**
   * 创建已完成状态
   */
  static completed(): VjudgeStatus {
    return new VjudgeStatus();
  }

  /**
   * 从现有状态克隆并修改
   */
  static from(status: Status): VjudgeStatus {
    const newStatus = new VjudgeStatus();
    for (const key of status.getKeys()) {
      const value = status.getValue(key);
      if (value) {
        newStatus.values.set(key, value);
      }
    }
    return newStatus;
  }
}

// ============================================================================
// 辅助函数
// ============================================================================

/**
 * 将 VjudgeValue 转换为字符串表示
 */
function valueToString(value: VjudgeValue): string {
  switch (value.type) {
    case "Inner":
      return `inner:${value.value}`;
    case "String":
      return `"${value.value}"`;
    case "Number":
      return String(value.value);
    case "Bool":
      return String(value.value);
    case "List":
      return `[${value.value.map(valueToString).join(", ")}]`;
  }
}

/**
 * 从原始值创建 VjudgeValue
 */
export function createValue(value: unknown): VjudgeValue {
  if (typeof value === "object" && value !== null && "type" in value && "value" in value) {
    return value as VjudgeValue;
  }
  if (typeof value === "string") {
    return { type: "String", value };
  }
  if (typeof value === "number") {
    return { type: "Number", value };
  }
  if (typeof value === "boolean") {
    return { type: "Bool", value };
  }
  if (Array.isArray(value)) {
    return { type: "List", value: value.map(createValue) };
  }
  // 默认转为字符串
  return { type: "String", value: String(value) };
}

// ============================================================================
// 新类型：WorkflowValuesStore (对应 Rust WorkflowValues)
// ============================================================================

/**
 * 值集合管理器
 *
 * 管理一组带信任标记的键值对，与 Rust 端 WorkflowValues 对齐。
 */
export class WorkflowValuesStore {
  private values: Map<string, WorkflowValue>;

  constructor() {
    this.values = new Map();
  }

  /** 添加不可信值（来自外部输入） */
  addUntrusted(key: string, value: BaseValue): void {
    this.values.set(key, WorkflowValueUtils.untrusted(value));
  }

  /** 添加可信值（服务内部生成） */
  addTrusted(key: string, value: BaseValue, source: string): void {
    this.values.set(key, WorkflowValueUtils.trusted(value, source));
  }

  /** 直接添加 WorkflowValue */
  add(key: string, value: WorkflowValue): void {
    this.values.set(key, value);
  }

  /** 获取值（不检查信任级别） */
  get(key: string): WorkflowValue | undefined {
    return this.values.get(key);
  }

  /** 获取可信值内部值（仅 Trusted 返回） */
  getTrusted(key: string): BaseValue | undefined {
    const v = this.values.get(key);
    if (v && WorkflowValueUtils.isTrusted(v)) {
      return WorkflowValueUtils.inner(v);
    }
    return undefined;
  }

  /** 获取内部基础值（不检查信任级别） */
  getInner(key: string): BaseValue | undefined {
    const v = this.values.get(key);
    return v ? WorkflowValueUtils.inner(v) : undefined;
  }

  /** 检查是否包含某个 key */
  containsKey(key: string): boolean {
    return this.values.has(key);
  }

  /** 获取所有 key */
  keys(): string[] {
    return Array.from(this.values.keys());
  }

  /** 获取值的数量 */
  get size(): number {
    return this.values.size;
  }

  /** 合并另一组值 */
  merge(other: WorkflowValuesStore): void {
    for (const [key, value] of other.values) {
      this.values.set(key, value);
    }
  }

  /** 转换为 JSON 序列化格式 */
  toJSON(): WorkflowValuesData {
    const result: WorkflowValuesData = {};
    for (const [key, value] of this.values) {
      result[key] = value;
    }
    return result;
  }

  /** 从 JSON 格式创建 */
  static fromJSON(data: WorkflowValuesData): WorkflowValuesStore {
    const store = new WorkflowValuesStore();
    for (const [key, value] of Object.entries(data)) {
      store.values.set(key, value);
    }
    return store;
  }

  /** 从旧的 VjudgeStatus 转换 */
  static fromVjudgeStatus(status: VjudgeStatus): WorkflowValuesStore {
    const store = new WorkflowValuesStore();
    for (const key of status.getKeys()) {
      const value = status.getValue(key);
      if (value) {
        if (value.type === "Inner") {
          store.addTrusted(key, BaseValueUtils.string(value.value), "inner_function");
        } else {
          store.addUntrusted(key, vjudgeValueToBaseValue(value));
        }
      }
    }
    return store;
  }

  /** 转换为旧的 VjudgeStatus（兼容层） */
  toVjudgeStatus(): VjudgeStatus {
    const status = new VjudgeStatus();
    for (const [key, wv] of this.values) {
      const baseValue = WorkflowValueUtils.inner(wv);
      status.withValue(key, baseValueToVjudgeValue(baseValue));
    }
    return status;
  }
}

/** 将旧 VjudgeValue 转换为 BaseValue */
function vjudgeValueToBaseValue(value: VjudgeValue): BaseValue {
  switch (value.type) {
    case "Inner":
      return BaseValueUtils.string(value.value);
    case "String":
      return BaseValueUtils.string(value.value);
    case "Number":
      return Number.isInteger(value.value)
        ? BaseValueUtils.int(value.value)
        : BaseValueUtils.number(value.value);
    case "Bool":
      return BaseValueUtils.bool(value.value);
    case "List":
      return BaseValueUtils.list(value.value.map(vjudgeValueToBaseValue));
  }
}

/** 将 BaseValue 转换为旧 VjudgeValue */
function baseValueToVjudgeValue(value: BaseValue): VjudgeValue {
  switch (value.type) {
    case "String":
      return { type: "String", value: value.value };
    case "Number":
      return { type: "Number", value: value.value };
    case "Int":
      return { type: "Number", value: value.value };
    case "Bool":
      return { type: "Bool", value: value.value };
    case "List":
      return { type: "List", value: value.value.map(baseValueToVjudgeValue) };
    case "Object":
      return { type: "String", value: JSON.stringify(value.value) };
    case "Null":
      return { type: "String", value: "null" };
  }
}
