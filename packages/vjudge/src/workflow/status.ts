/**
 * VJudge Status 实现
 */

import type {
  Status,
  StatusData,
  VjudgeStatusType,
  VjudgeValue,
} from "./types.ts";

/**
 * VjudgeStatus 具体实现
 */
export class VjudgeStatus implements Status {
  private statusType: VjudgeStatusType;
  private values: Map<string, VjudgeValue>;

  constructor(statusType: VjudgeStatusType = "Initial") {
    this.statusType = statusType;
    this.values = new Map();
  }

  // ============================================================================
  // Status 接口实现
  // ============================================================================

  getStatus(): string {
    const entries = Array.from(this.values.entries())
      .map(([k, v]) => `${k}=${valueToString(v)}`)
      .join(", ");
    return `${this.statusType}(${entries})`;
  }

  getStatusType(): VjudgeStatusType {
    return this.statusType;
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
      statusType: this.statusType,
      values: valuesObj,
    };
  }

  // ============================================================================
  // 构建器方法
  // ============================================================================

  /**
   * 设置状态类型
   */
  withStatusType(statusType: VjudgeStatusType): VjudgeStatus {
    this.statusType = statusType;
    return this;
  }

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
    const status = new VjudgeStatus(data.statusType);
    for (const [key, value] of Object.entries(data.values)) {
      status.values.set(key, value);
    }
    return status;
  }

  /**
   * 创建初始状态
   */
  static initial(): VjudgeStatus {
    return new VjudgeStatus("Initial");
  }

  /**
   * 创建错误状态
   */
  static error(message: string): VjudgeStatus {
    return new VjudgeStatus("Error").withString("error_message", message);
  }

  /**
   * 创建已完成状态
   */
  static completed(): VjudgeStatus {
    return new VjudgeStatus("Completed");
  }

  /**
   * 从现有状态克隆并修改
   */
  static from(status: Status): VjudgeStatus {
    const newStatus = new VjudgeStatus(status.getStatusType());
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
