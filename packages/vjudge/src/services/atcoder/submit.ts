/**
 * AtCoder Submit Service
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
    const token = input.getValue("token");
    const contestId = input.getValue("contest_id");
    const problemId = input.getValue("problem_id");
    const code = input.getValue("code");
    const languageId = input.getValue("language_id");

    if (
      token?.type !== "String" ||
      contestId?.type !== "String" ||
      problemId?.type !== "String" ||
      code?.type !== "String" ||
      languageId?.type !== "String"
    ) {
      return VjudgeStatus.error("Invalid input types");
    }

    try {
      // 构造兼容旧接口的任务数据
      const task = {
        token: token.value,
        contest_id: contestId.value,
        problem_id: problemId.value,
        code: code.value,
        language: languageId.value,
      };

      const submissionId = await submitService.submit(task);

      if (submissionId) {
        const submissionUrl = `https://atcoder.jp/contests/${contestId.value}/submissions/${submissionId}`;
        return VjudgeStatus.from(input)
          .withStatusType("SubmissionCreated")
          .withBool("submit_success", true)
          .withString("submission_id", submissionId)
          .withString("submission_url", submissionUrl)
          .withString("message", "Code submitted successfully");
      } else {
        return VjudgeStatus.from(input)
          .withStatusType("Error")
          .withBool("submit_success", false)
          .withString("error_message", "Submit failed: no submission ID returned");
      }
    } catch (error) {
      return VjudgeStatus.from(input)
        .withStatusType("Error")
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
