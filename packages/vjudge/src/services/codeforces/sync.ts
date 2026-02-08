/**
 * Codeforces Sync Services
 * 同步提交记录的 EdgeService 实现
 */

import {
  EdgeService,
  VjudgeStatus,
  statusRequire,
  statusDescribe,
  type Status,
  type StatusRequire,
  type StatusDescribe,
  createValue,
} from "../../workflow/index.ts";
// 引用现有服务
import * as syncListService from "../../../vjudge_services/codeforces/syncList.ts";
import * as syncOneService from "../../../vjudge_services/codeforces/syncOne.ts";

/**
 * Codeforces SyncList API Key 服务
 * 使用 API Key 批量同步用户提交记录
 */
export class CodeforcesSyncListApiKeyService extends EdgeService {
  constructor() {
    super({
      name: "codeforces:syncList:apikey",
      description: "Sync user submissions from Codeforces using API Key",
      platform: "codeforces",
      operation: "syncList",
      method: "apikey",
      cost: 15,
      isEnd: false,
    });
  }

  protected defineImportRequire(): StatusRequire {
    return statusRequire(["handle", "api_key", "api_secret"], ["AccountVerified"]);
  }

  protected defineExportDescribe(): StatusDescribe[] {
    return [
      statusDescribe("submissions", "List"),
      statusDescribe("sync_count", "Number"),
    ];
  }

  protected async doExecute(input: Status): Promise<Status> {
    const handle = input.getValue("handle");
    const apiKey = input.getValue("api_key");
    const apiSecret = input.getValue("api_secret");
    const rangeValue = input.getValue("range");

    if (handle?.type !== "String" || apiKey?.type !== "String" || apiSecret?.type !== "String") {
      return VjudgeStatus.error("Invalid input types");
    }

    // 构造兼容旧接口的任务数据
    const task = {
      vjudge_node: {
        node_id: "",
        public: { iden: handle.value, platform: "codeforces" },
        private: { auth: { Token: `${apiKey.value}:${apiSecret.value}` } },
      },
      ws_id: null,
      operation: "syncList",
      platform: "codeforces",
      method: "apikey",
      range: rangeValue?.type === "String" ? rangeValue.value : undefined,
    };

    const result = await syncListService.apikey(task as any);

    if (result.event === "sync_done_success") {
      const submissions = result.data.map(sub => createValue(sub));
      return VjudgeStatus.from(input)
        .withStatusType("ProblemSynced")
        .withList("submissions", submissions)
        .withNumber("sync_count", result.data.length);
    } else {
      return VjudgeStatus.error("Failed to sync submissions");
    }
  }
}

/**
 * Codeforces SyncOne Token 服务
 * 使用 Token 同步单个提交记录（需要浏览器）
 */
export class CodeforcesSyncOneTokenService extends EdgeService {
  constructor() {
    super({
      name: "codeforces:syncOne:token",
      description: "Sync a single submission from Codeforces using session token",
      platform: "codeforces",
      operation: "syncOne",
      method: "token",
      cost: 30, // 更高成本因为需要浏览器
      isEnd: false,
    });
  }

  protected defineImportRequire(): StatusRequire {
    return statusRequire(["handle", "token", "submission_url"], ["AccountVerified"]);
  }

  protected defineExportDescribe(): StatusDescribe[] {
    return [
      statusDescribe("submissions", "List"),
      statusDescribe("sync_count", "Number"),
    ];
  }

  protected async doExecute(input: Status): Promise<Status> {
    const handle = input.getValue("handle");
    const token = input.getValue("token");
    const submissionUrl = input.getValue("submission_url");

    if (handle?.type !== "String" || token?.type !== "String" || submissionUrl?.type !== "String") {
      return VjudgeStatus.error("Invalid input types");
    }

    // 构造兼容旧接口的任务数据
    const task = {
      vjudge_node: {
        node_id: 0, // 兼容 VjudgeNode 类型
        public: { iden: handle.value, platform: "codeforces" },
        private: { auth: { Token: token.value } },
      },
      info: "",
      url: submissionUrl.value,
    };

    const result = await syncOneService.token(task as any);

    if (result && result.event === "sync_done_success") {
      const submissions = result.data.map((sub: any) => createValue(sub));
      return VjudgeStatus.from(input)
        .withStatusType("ProblemSynced")
        .withList("submissions", submissions)
        .withNumber("sync_count", result.data.length);
    } else {
      return VjudgeStatus.error("Failed to sync single submission");
    }
  }
}

/**
 * 获取所有 Codeforces 同步服务
 */
export function getCodeforcesSyncServices(): EdgeService[] {
  return [
    new CodeforcesSyncListApiKeyService(),
    new CodeforcesSyncOneTokenService(),
  ];
}
