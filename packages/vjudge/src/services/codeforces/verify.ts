/**
 * Codeforces Verify Services
 * 将现有的验证逻辑封装为 EdgeService
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
        statusDescribe("account_id", "String"),
        statusDescribe("verified", "Bool"),
        statusDescribe("vjudge_id", "String"),
        ];
    }

    protected async doExecute(input: Status): Promise<Status> {
        const handleValue = readStringValue(input.getValue("handle"));
        const apiKeyValue = readStringValue(input.getValue("api_key"));
        const apiSecretValue = readStringValue(input.getValue("api_secret"));
        console.log(handleValue);
        console.log(apiKeyValue);
        console.log(apiSecretValue);
        if (!handleValue || !apiKeyValue || !apiSecretValue) {
        return VjudgeStatus.error("Invalid input types");
        }

        const verified = await verifyApiKey(handleValue, apiKeyValue, apiSecretValue);

        return VjudgeStatus.from(input)
        .withBool("verified", verified)
        .withString("account_id", handleValue);
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
    const handleValue = readStringValue(input.getValue("handle"));
    const tokenValue = readStringValue(input.getValue("token"));

    if (!handleValue || !tokenValue) {
      return VjudgeStatus.error("Invalid input types");
    }

    const verified = await checkLoginWithToken(handleValue, tokenValue);

    return VjudgeStatus.from(input)
      .withBool("verified", verified)
      .withString("account_id", handleValue);
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
      cost: 100, // not recommended due to security and reliability issues
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
    const handleValue = readStringValue(input.getValue("handle"));
    const passwordValue = readStringValue(input.getValue("password"));

    if (!handleValue || !passwordValue) {
      return VjudgeStatus.error("Invalid input types");
    }

    const sessionToken = await loginWithPassword(handleValue, passwordValue);
    const verified = sessionToken !== "";

    const result = VjudgeStatus.from(input)
      .withBool("verified", verified)
      .withString("account_id", handleValue);

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
