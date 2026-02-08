/**
 * Codeforces Submit Service
 * 提交代码的 EdgeService 实现
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
// 引用现有服务
import * as submitService from "../../../vjudge_services/codeforces/submit.ts";

/**
 * Codeforces Submit Token 服务
 * 使用 Token 提交代码到 Codeforces
 */
export class CodeforcesSubmitTokenService extends EdgeService {
  constructor() {
    super({
      name: "codeforces:submit:token",
      description: "Submit code to Codeforces using session token",
      platform: "codeforces",
      operation: "submit",
      method: "token",
      cost: 50, // 高成本因为需要浏览器操作
      isEnd: false,
    });
  }

  protected defineImportRequire(): StatusRequire {
    return statusRequire([
      "handle",
      "token",
      "problem_url",     // 格式: "contest_id:problem_id"
      "code",
      "language_id",
      "record_id",
    ], ["AccountVerified"]);
  }

  protected defineExportDescribe(): StatusDescribe[] {
    return [
      statusDescribe("submission_id", "String"),
      statusDescribe("submission_url", "String"),
      statusDescribe("submit_success", "Bool"),
    ];
  }

  protected async doExecute(input: Status): Promise<Status> {
    const handle = input.getValue("handle");
    const token = input.getValue("token");
    const problemUrl = input.getValue("problem_url");
    const code = input.getValue("code");
    const languageId = input.getValue("language_id");
    const recordId = input.getValue("record_id");
    const bypassCf = input.getValue("bypass_cf");

    if (
      handle?.type !== "String" ||
      token?.type !== "String" ||
      problemUrl?.type !== "String" ||
      code?.type !== "String" ||
      languageId?.type !== "String" ||
      recordId?.type !== "String"
    ) {
      return VjudgeStatus.error("Invalid input types");
    }

    // 构造兼容旧接口的任务数据
    const task = {
      vjudge_node: {
        node_id: 0,
        public: { iden: handle.value, platform: "codeforces" },
        private: { auth: { Token: token.value } },
      },
      context: {
        code: code.value,
        record_id: recordId.value,
      },
      url: problemUrl.value,
      language_id: languageId.value,
      bypass_cf: bypassCf?.type === "Bool" ? bypassCf.value : false,
    };

    const result = await submitService.submit(task as any);

    if (result.data.success) {
      return VjudgeStatus.from(input)
        .withStatusType("SubmissionCreated")
        .withBool("submit_success", true)
        .withString("submission_url", result.data.remote_url)
        .withString("message", result.data.message);
    } else {
      return VjudgeStatus.from(input)
        .withStatusType("Error")
        .withBool("submit_success", false)
        .withString("error_message", result.data.message);
    }
  }
}

/**
 * 获取所有 Codeforces 提交服务
 */
export function getCodeforcesSubmitServices(): EdgeService[] {
  return [
    new CodeforcesSubmitTokenService(),
  ];
}
