/**
 * Edge Services 入口
 * 整合所有平台的 EdgeService 并提供统一注册
 */

import type { EdgeService } from "../workflow/index.ts";
import { ServiceRegistry } from "../workflow/index.ts";

// 导入各平台服务
import { getCodeforcesPlatformServices, CODEFORCES_PLATFORM } from "./codeforces/index.ts";
import { getAtCoderPlatformServices, ATCODER_PLATFORM } from "./atcoder/index.ts";

/**
 * 支持的平台列表
 */
export const SUPPORTED_PLATFORMS = {
  codeforces: CODEFORCES_PLATFORM,
  atcoder: ATCODER_PLATFORM,
  // 后续添加其他平台:
  // luogu: LUOGU_PLATFORM,
  // loj: LOJ_PLATFORM,
} as const;

/**
 * 获取所有可用的 EdgeService
 */
export function getAllEdgeServices(): EdgeService[] {
  return [
    ...getCodeforcesPlatformServices(),
    ...getAtCoderPlatformServices(),
    // 后续添加其他平台服务:
    // ...getLuoguPlatformServices(),
    // ...getLojPlatformServices(),
  ];
}

/**
 * 创建并初始化服务注册表
 * 注册所有可用的边缘服务
 */
export function createServiceRegistry(): ServiceRegistry {
  const registry = new ServiceRegistry();
  
  // 注册所有服务
  const services = getAllEdgeServices();
  for (const service of services) {
    registry.register(service);
  }
  
  return registry;
}

/**
 * 获取指定平台的服务
 */
export function getServicesForPlatform(platform: string): EdgeService[] {
  return getAllEdgeServices().filter(
    service => service.getInfo().name.startsWith(`${platform}:`)
  );
}

/**
 * 获取指定操作类型的服务
 */
export function getServicesForOperation(operation: string): EdgeService[] {
  return getAllEdgeServices().filter(
    service => service.getInfo().name.includes(`:${operation}:`)
  );
}

// 重新导出类型和模块
export * from "./codeforces/index.ts";
export * from "./atcoder/index.ts";
