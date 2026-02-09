/**
 * Codeforces Query Service
 * 查询提交状态的 EdgeService 实现
 */

import {
  EdgeService,
  VjudgeStatus,
  statusRequire,
  statusDescribe,
  type Status,
  type StatusRequire,
  type StatusDescribe,
} from "../../workflow/index.ts";

/**
 * Codeforces Query Token 服务
 * 查询提交状态（轮询方式）
 * 
 * 注意：实际的实时追踪使用 track.ts 中的 WebSocket 服务
 * 这里提供一个简化的查询接口
 */
export class CodeforcesQueryTokenService extends EdgeService {
  constructor() {
    super({
      name: "codeforces:query:token",
      description: "Query submission status from Codeforces",
      platform: "codeforces",
      operation: "query",
      method: "token",
      cost: 5,
      isEnd: false,
    });
  }

  protected defineImportRequire(): StatusRequire {
    return statusRequire([
      "submission_url",
    ]);
  }

  protected defineExportDescribe(): StatusDescribe[] {
    return [
      statusDescribe("query_result", "String"),
      statusDescribe("query_status", "String"),
      statusDescribe("verdict", "String"),
    ];
  }

  protected async doExecute(input: Status): Promise<Status> {
    const submissionUrl = input.getValue("submission_url");

    if (submissionUrl?.type !== "String") {
      return VjudgeStatus.error("Invalid submission_url type");
    }

    try {
      // 从 submission URL 提取信息
      // 格式: https://codeforces.com/contest/{contestId}/submission/{submissionId}
      const match = submissionUrl.value.match(/\/submission\/(\d+)/);
      if (!match) {
        return VjudgeStatus.error("Invalid submission URL format");
      }

      const submissionId = match[1];
      
      // 使用 Codeforces API 查询
      const apiUrl = `https://codeforces.com/api/user.status?handle=_&count=100`;
      
      // 注意：这是简化实现。实际应使用 track.ts 中的 WebSocket 方式
      // 或者通过 submission_id 直接查询
      
      return VjudgeStatus.from(input)
        .withString("query_status", "pending")
        .withString("submission_id", submissionId)
        .withString("message", "Query initiated, use track service for real-time updates");
        
    } catch (error) {
      return VjudgeStatus.from(input)
        .withString("error_message", `Query failed: ${error}`);
    }
  }
}

/**
 * 获取所有 Codeforces 查询服务
 */
export function getCoforcesQueryServices(): EdgeService[] {
  return [
    new CodeforcesQueryTokenService(),
  ];
}
