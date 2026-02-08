/**
 * AtCoder Sync Service
 * 题目同步的 EdgeService 实现
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
 * AtCoder 题目同步服务
 * 从 AtCoder 获取题目信息
 */
export class AtCoderSyncOneService extends EdgeService {
  constructor() {
    super({
      name: "atcoder:syncOne:token",
      description: "Sync problem from AtCoder using session token",
      platform: "atcoder",
      operation: "syncOne",
      method: "token",
      cost: 10,
      isEnd: false,
    });
  }

  protected defineImportRequire(): StatusRequire {
    return statusRequire([
      "handle",
      "token",
      "problem_url",
    ], ["AccountVerified"]);
  }

  protected defineExportDescribe(): StatusDescribe[] {
    return [
      statusDescribe("problem_title", "String"),
      statusDescribe("problem_content", "String"),
      statusDescribe("time_limit", "String"),
      statusDescribe("memory_limit", "String"),
      statusDescribe("sync_success", "Bool"),
    ];
  }

  protected async doExecute(input: Status): Promise<Status> {
    const handle = input.getValue("handle");
    const token = input.getValue("token");
    const problemUrl = input.getValue("problem_url");

    if (
      handle?.type !== "String" ||
      token?.type !== "String" ||
      problemUrl?.type !== "String"
    ) {
      return VjudgeStatus.error("Invalid input types");
    }

    try {
      // 解析 AtCoder URL
      // 格式: https://atcoder.jp/contests/{contest_id}/tasks/{problem_id}
      const urlMatch = problemUrl.value.match(
        /atcoder\.jp\/contests\/([^/]+)\/tasks\/([^/?]+)/
      );
      
      if (!urlMatch) {
        return VjudgeStatus.from(input)
          .withStatusType("Error")
          .withBool("sync_success", false)
          .withString("error_message", "Invalid AtCoder problem URL format");
      }

      const [, contestId, problemId] = urlMatch;
      
      // 获取题目页面
      const response = await fetch(problemUrl.value, {
        headers: {
          "Cookie": `REVEL_SESSION=${token.value}`,
          "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        },
      });

      if (!response.ok) {
        return VjudgeStatus.from(input)
          .withStatusType("Error")
          .withBool("sync_success", false)
          .withString("error_message", `Failed to fetch problem: HTTP ${response.status}`);
      }

      const html = await response.text();
      
      // 简单解析标题
      const titleMatch = html.match(/<title>(.+?)<\/title>/);
      const title = titleMatch ? titleMatch[1].split(" - ")[0] : `${contestId}_${problemId}`;

      // 解析时间和内存限制
      const timeLimitMatch = html.match(/Time Limit:\s*([\d.]+)\s*sec/i);
      const memoryLimitMatch = html.match(/Memory Limit:\s*(\d+)\s*MB/i);

      return VjudgeStatus.from(input)
        .withStatusType("ProblemSynced")
        .withBool("sync_success", true)
        .withString("problem_title", title)
        .withString("problem_content", html)
        .withString("contest_id", contestId)
        .withString("problem_id", problemId)
        .withString("time_limit", timeLimitMatch ? `${timeLimitMatch[1]}s` : "unknown")
        .withString("memory_limit", memoryLimitMatch ? `${memoryLimitMatch[1]}MB` : "unknown");

    } catch (error) {
      return VjudgeStatus.from(input)
        .withStatusType("Error")
        .withBool("sync_success", false)
        .withString("error_message", `Sync failed: ${error}`);
    }
  }
}

/**
 * 获取所有 AtCoder 同步服务
 */
export function getAtCoderSyncServices(): EdgeService[] {
  return [
    new AtCoderSyncOneService(),
  ];
}
