/**
 * AtCoder Verify Service
 * 账户验证的 EdgeService 实现
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
import * as verifyService from "../../../vjudge_services/atcoder/verify.ts";

/**
 * AtCoder Token 验证服务
 * 使用 REVEL_SESSION cookie 验证账户
 */
export class AtCoderVerifyTokenService extends EdgeService {
  constructor() {
    super({
      name: "atcoder:verify:token",
      description: "Verify AtCoder account using REVEL_SESSION cookie token",
      platform: "atcoder",
      operation: "verify",
      method: "token",
      cost: 10,
      isEnd: false,
    });
  }

  protected defineImportRequire(): StatusRequire {
    return statusRequire(["handle", "token"], ["Initial"]);
  }

  protected defineExportDescribe(): StatusDescribe[] {
    return [
      statusDescribe("verified", "Bool"),
      statusDescribe("message", "String"),
    ];
  }

  protected async doExecute(input: Status): Promise<Status> {
    const handle = input.getValue("handle");
    const token = input.getValue("token");

    if (handle?.type !== "String" || token?.type !== "String") {
      return VjudgeStatus.error("Invalid input types");
    }

    // 构造兼容旧接口的任务数据
    const task = {
      vjudge_node: {
        node_id: 0,
        public: { iden: handle.value, platform: "atcoder" },
        private: { auth: { Token: token.value } },
      },
      ws_id: "",
    };

    const result = await verifyService.token(task as any);

    if (result.data.result) {
      return VjudgeStatus.from(input)
        .withStatusType("AccountVerified")
        .withBool("verified", true)
        .withString("message", "AtCoder account verified successfully");
    } else {
      return VjudgeStatus.from(input)
        .withStatusType("Error")
        .withBool("verified", false)
        .withString("error_message", "Token verification failed");
    }
  }
}

/**
 * AtCoder Password 验证服务
 * 使用用户名密码登录验证
 */
export class AtCoderVerifyPasswordService extends EdgeService {
  constructor() {
    super({
      name: "atcoder:verify:password",
      description: "Verify AtCoder account using username and password",
      platform: "atcoder",
      operation: "verify",
      method: "password",
      cost: 15,
      isEnd: false,
    });
  }

  protected defineImportRequire(): StatusRequire {
    return statusRequire(["handle", "password"], ["Initial"]);
  }

  protected defineExportDescribe(): StatusDescribe[] {
    return [
      statusDescribe("verified", "Bool"),
      statusDescribe("message", "String"),
      statusDescribe("token", "String"),
    ];
  }

  protected async doExecute(input: Status): Promise<Status> {
    const handle = input.getValue("handle");
    const password = input.getValue("password");

    if (handle?.type !== "String" || password?.type !== "String") {
      return VjudgeStatus.error("Invalid input types");
    }

    // 构造兼容旧接口的任务数据
    const task = {
      vjudge_node: {
        node_id: 0,
        public: { iden: handle.value, platform: "atcoder" },
        private: { auth: { Password: password.value } },
      },
      ws_id: "",
    };

    const result = await verifyService.password(task as any);

    if (result.data.result) {
      return VjudgeStatus.from(input)
        .withStatusType("AccountVerified")
        .withBool("verified", true)
        .withString("message", "AtCoder login successful");
    } else {
      return VjudgeStatus.from(input)
        .withStatusType("Error")
        .withBool("verified", false)
        .withString("error_message", "Password login failed");
    }
  }
}

/**
 * 获取所有 AtCoder 验证服务
 */
export function getAtCoderVerifyServices(): EdgeService[] {
  return [
    new AtCoderVerifyTokenService(),
    new AtCoderVerifyPasswordService(),
  ];
}
