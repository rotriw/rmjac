/**
 * Codeforces Submit Service
 * 提交代码的 EdgeService 实现
 */

import {
  EdgeService,
  VjudgeStatus,
  statusRequire,
  statusDescribe,
  readStringValue,
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
    ]);
  }

  protected defineExportDescribe(): StatusDescribe[] {
    return [
      statusDescribe("submission_id", "String"),
      statusDescribe("submission_url", "String"),
      statusDescribe("submit_success", "Bool"),
    ];
  }

  protected async doExecute(input: Status): Promise<Status> {
    const handleValue = readStringValue(input.getValue("handle"));
    const tokenValue = readStringValue(input.getValue("token"));
    const problemUrlValue = readStringValue(input.getValue("problem_url"));
    const codeValue = readStringValue(input.getValue("code"));
    const languageIdValue = readStringValue(input.getValue("language_id"));
    const recordIdValue = readStringValue(input.getValue("record_id"));
    const bypassCf = input.getValue("bypass_cf");

    if (
      !handleValue ||
      !tokenValue ||
      !problemUrlValue ||
      !codeValue ||
      !languageIdValue ||
      !recordIdValue
    ) {
      return VjudgeStatus.error("Invalid input types");
    }

    // 构造兼容旧接口的任务数据
    const task = {
      vjudge_node: {
        node_id: 0,
        public: { iden: handleValue, platform: "codeforces" },
        private: { auth: { Token: tokenValue } },
      },
      context: {
        code: codeValue,
        record_id: recordIdValue,
      },
      url: problemUrlValue,
      language_id: languageIdValue,
      bypass_cf: bypassCf?.type === "Bool" ? bypassCf.value : false,
    };

    const result = await submitService.submit(task as any);

    if (result.data.success) {
      return VjudgeStatus.from(input)
        .withBool("submit_success", true)
        .withString("submission_url", result.data.remote_url)
        .withString("message", result.data.message);
    } else {
      return VjudgeStatus.from(input)
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
