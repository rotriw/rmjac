/**
 * AtCoder Submit Service
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
import * as submitService from "../../../vjudge_services/atcoder/submit.ts";

/**
 * AtCoder Submit Token 服务
 * 使用 Token 提交代码到 AtCoder
 */
export class AtCoderSubmitTokenService extends EdgeService {
  constructor() {
    super({
      name: "atcoder:submit:token",
      description: "Submit code to AtCoder using session token",
      platform: "atcoder",
      operation: "submit",
      method: "token",
      cost: 50,
      isEnd: false,
    });
  }

  protected defineImportRequire(): StatusRequire {
    return statusRequire([
      "handle",
      "token",
      "contest_id",
      "problem_id",
      "code",
      "language_id",
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
    const tokenValue = readStringValue(input.getValue("token"));
    const contestIdValue = readStringValue(input.getValue("contest_id"));
    const problemIdValue = readStringValue(input.getValue("problem_id"));
    const codeValue = readStringValue(input.getValue("code"));
    const languageIdValue = readStringValue(input.getValue("language_id"));

    if (
      !tokenValue ||
      !contestIdValue ||
      !problemIdValue ||
      !codeValue ||
      !languageIdValue
    ) {
      return VjudgeStatus.error("Invalid input types");
    }

    try {
      // 构造兼容旧接口的任务数据
      const task = {
        token: tokenValue,
        contest_id: contestIdValue,
        problem_id: problemIdValue,
        code: codeValue,
        language: languageIdValue,
      };

      const submissionId = await submitService.submit(task);

      if (submissionId) {
        const submissionUrl = `https://atcoder.jp/contests/${contestIdValue}/submissions/${submissionId}`;
        return VjudgeStatus.from(input)
          .withBool("submit_success", true)
          .withString("submission_id", submissionId)
          .withString("submission_url", submissionUrl)
          .withString("message", "Code submitted successfully");
      } else {
        return VjudgeStatus.from(input)
          .withBool("submit_success", false)
          .withString("error_message", "Submit failed: no submission ID returned");
      }
    } catch (error) {
      return VjudgeStatus.from(input)
        .withBool("submit_success", false)
        .withString("error_message", `Submit failed: ${error}`);
    }
  }
}

/**
 * 获取所有 AtCoder 提交服务
 */
export function getAtCoderSubmitServices(): EdgeService[] {
  return [
    new AtCoderSubmitTokenService(),
  ];
}
