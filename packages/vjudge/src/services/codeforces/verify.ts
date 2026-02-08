/**
 * Codeforces Verify Services
 * 将现有的验证逻辑封装为 EdgeService
 */

import {
  EdgeService,
  VjudgeStatus,
  VjudgeStatusRequire,
  VjudgeStatusDescribe,
  statusRequire,
  statusDescribe,
  type Status,
  type StatusRequire,
  type StatusDescribe,
} from "../../workflow/index.ts";
// 引用现有的 vjudge_services 中的服务实现
import { verifyApiKey } from "../../../vjudge_services/codeforces/service/verify.ts";
import { checkLoginWithToken, loginWithPassword } from "../../../vjudge_services/codeforces/service/submission.ts";

/**
 * Codeforces API Key 验证服务
 */
export class CodeforcesVerifyApiKeyService extends EdgeService {
  constructor() {
    super({
      name: "codeforces:verify:apikey",
      description: "Verify Codeforces account using API Key and Secret",
      platform: "codeforces",
      operation: "verify",
      method: "apikey",
      cost: 5,
      isEnd: false,
    });
  }

  protected defineImportRequire(): StatusRequire {
    return statusRequire(["handle", "api_key", "api_secret"]);
  }

  protected defineExportDescribe(): StatusDescribe[] {
    return [
      statusDescribe("verified", "Bool"),
      statusDescribe("account_id", "String"),
    ];
  }

  protected async doExecute(input: Status): Promise<Status> {
    const handle = input.getValue("handle");
    const apiKey = input.getValue("api_key");
    const apiSecret = input.getValue("api_secret");

    if (handle?.type !== "String" || apiKey?.type !== "String" || apiSecret?.type !== "String") {
      return VjudgeStatus.error("Invalid input types");
    }

    const verified = await verifyApiKey(handle.value, apiKey.value, apiSecret.value);

    return VjudgeStatus.from(input)
      .withStatusType("AccountVerified")
      .withBool("verified", verified)
      .withString("account_id", handle.value);
  }
}

/**
 * Codeforces Token 验证服务
 */
export class CodeforcesVerifyTokenService extends EdgeService {
  constructor() {
    super({
      name: "codeforces:verify:token",
      description: "Verify Codeforces account using session token",
      platform: "codeforces",
      operation: "verify",
      method: "token",
      cost: 10,
      isEnd: false,
    });
  }

  protected defineImportRequire(): StatusRequire {
    return statusRequire(["handle", "token"]);
  }

  protected defineExportDescribe(): StatusDescribe[] {
    return [
      statusDescribe("verified", "Bool"),
      statusDescribe("account_id", "String"),
    ];
  }

  protected async doExecute(input: Status): Promise<Status> {
    const handle = input.getValue("handle");
    const token = input.getValue("token");

    if (handle?.type !== "String" || token?.type !== "String") {
      return VjudgeStatus.error("Invalid input types");
    }

    const verified = await checkLoginWithToken(handle.value, token.value);

    return VjudgeStatus.from(input)
      .withStatusType("AccountVerified")
      .withBool("verified", verified)
      .withString("account_id", handle.value);
  }
}

/**
 * Codeforces Password 验证服务
 */
export class CodeforcesVerifyPasswordService extends EdgeService {
  constructor() {
    super({
      name: "codeforces:verify:password",
      description: "Verify Codeforces account using password login",
      platform: "codeforces",
      operation: "verify",
      method: "password",
      cost: 20, // 更高成本因为需要完整登录流程
      isEnd: false,
    });
  }

  protected defineImportRequire(): StatusRequire {
    return statusRequire(["handle", "password"]);
  }

  protected defineExportDescribe(): StatusDescribe[] {
    return [
      statusDescribe("verified", "Bool"),
      statusDescribe("account_id", "String"),
      statusDescribe("session_token", "String"),
    ];
  }

  protected async doExecute(input: Status): Promise<Status> {
    const handle = input.getValue("handle");
    const password = input.getValue("password");

    if (handle?.type !== "String" || password?.type !== "String") {
      return VjudgeStatus.error("Invalid input types");
    }

    const sessionToken = await loginWithPassword(handle.value, password.value);
    const verified = sessionToken !== "";

    const result = VjudgeStatus.from(input)
      .withStatusType("AccountVerified")
      .withBool("verified", verified)
      .withString("account_id", handle.value);

    if (verified) {
      result.withString("session_token", sessionToken);
    }

    return result;
  }
}

/**
 * 获取所有 Codeforces 验证服务
 */
export function getCodeforcesVerifyServices(): EdgeService[] {
  return [
    new CodeforcesVerifyApiKeyService(),
    new CodeforcesVerifyTokenService(),
    new CodeforcesVerifyPasswordService(),
  ];
}
