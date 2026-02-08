/**
 * VJudge Edge Service - 新入口文件
 * 使用 Workflow 架构的边缘服务
 */

import log4js from "log4js";
import { io } from "socket.io-client";
import * as openpgp from "openpgp";
import * as fs from "node:fs";
import process from "node:process";

import { getServiceRegistry, type ServiceRegistry } from "./workflow/index.ts";
import { getAllEdgeServices } from "./services/index.ts";

// ============================================================================
// 全局类型声明（保持向后兼容）
// ============================================================================

declare global {
  var LOG: log4js.Logger;
  var PRIVATE_KEY: string;
  var PRIVATE_PWD: string;
  var SERVER_URL: string;
}

// ============================================================================
// 配置
// ============================================================================

interface EdgeServerConfig {
  privateKeyPath: string;
  privateKeyPassword: string;
  serverUrl: string;
  logLevel: string;
}

function loadConfig(): EdgeServerConfig {
  return {
    privateKeyPath: process.env.PRIVATE_PATH || "./private.asc",
    privateKeyPassword: process.env.PRIVATE_PWD || "",
    serverUrl: process.env.SERVER_URL || "http://localhost:1825/vjudge",
    logLevel: process.env.LOG_LEVEL || "debug",
  };
}

// ============================================================================
// 认证
// ============================================================================

async function authenticate(socket: import("socket.io-client").Socket, privateKey: string, privateKeyPassword: string): Promise<void> {
  const message = await openpgp.createCleartextMessage({
    text: `Rotriw_Edge_Server_${socket.id || ""}`,
  });
  
  const signingKeys = await openpgp.decryptKey({
    privateKey: await openpgp.readPrivateKey({ armoredKey: privateKey }),
    passphrase: privateKeyPassword,
  });
  
  const signedMessage = await openpgp.sign({
    message,
    signingKeys,
  });
  
  socket.emit("auth", signedMessage);
}

// ============================================================================
// 主启动函数
// ============================================================================

async function startEdgeServer(): Promise<void> {
  const config = loadConfig();
  
  // 初始化日志
  const logger = log4js.getLogger();
  logger.level = config.logLevel;
  global.LOG = logger;
  
  LOG.info("Starting VJudge Edge Server...");
  
  // 加载私钥
  if (!fs.existsSync(config.privateKeyPath)) {
    LOG.error(`Private key file not found: ${config.privateKeyPath}`);
    process.exit(1);
  }
  const privateKey = fs.readFileSync(config.privateKeyPath).toString();
  
  // 初始化 ServiceRegistry
  const registry = getServiceRegistry({
    logger: {
      info: (msg) => LOG.info(msg),
      warn: (msg) => LOG.warn(msg),
      error: (msg) => LOG.error(msg),
      debug: (msg) => LOG.debug(msg),
    },
  });
  
  // 注册所有服务
  const services = getAllEdgeServices();
  LOG.info(`[Edge] Registering ${services.length} services...`);
  registry.registerAll(services);
  for (const svc of services) {
    const info = svc.getInfo();
    LOG.info(`[Edge]   - ${info.name}: ${info.description}`);
  }
  LOG.info(`[Edge] All ${services.length} services registered to local registry`);
  
  // 连接到服务器
  LOG.info(`[Edge] Connecting to server: ${config.serverUrl}`);
  const socket = io(config.serverUrl);
  
  // 监听所有事件（调试用）
  socket.onAny((eventName: string, ...args: unknown[]) => {
    if (eventName === "workflow_task") {
      // workflow_task 事件在 service-registry 中单独处理，这里只简要记录
      LOG.info(`[Edge:onAny] Received event "${eventName}" (detailed logs in ServiceRegistry)`);
    } else {
      const argSummary = args.map(a => {
        const s = typeof a === "string" ? a : JSON.stringify(a);
        return s && s.length > 200 ? s.substring(0, 200) + "..." : s;
      });
      LOG.info(`[Edge:onAny] Received event "${eventName}", args=${argSummary.join(", ")}`);
    }
  });

  socket.on("connect", async () => {
    LOG.info(`[Edge] Connected to server, socket.id=${socket.id}, transport=${socket.io.engine?.transport?.name}`);
    LOG.info(`[Edge] Authenticating...`);
    await authenticate(socket, privateKey, config.privateKeyPassword);
    LOG.info(`[Edge] Auth message sent`);
  });
  
  socket.on("auth_response", (data: string) => {
    LOG.info(`[Edge] Received auth_response: "${data}"`);
    if (data.match("success")) {
      LOG.info(`[Edge] Authentication successful, binding socket to registry...`);
      // 绑定 socket 到 registry，触发服务注册
      registry.bindSocket(socket);
      LOG.info(`[Edge] Socket bound to registry, services should be registered now`);
    } else {
      LOG.error(`[Edge] Authentication failed: ${data}`);
    }
  });
  
  socket.on("connect_error", (error: Error) => {
    LOG.error(`[Edge] Connection error: ${error.message}`);
  });

  socket.on("disconnect", (reason: string) => {
    LOG.warn(`[Edge] Disconnected from server, reason: ${reason}`);
  });
  
  socket.on("error", (error: Error) => {
    LOG.error(`[Edge] Socket error: ${error.message}`);
  });
  
  // 保持向后兼容的全局变量
  global.PRIVATE_KEY = privateKey;
  global.PRIVATE_PWD = config.privateKeyPassword;
  global.SERVER_URL = config.serverUrl;
  
  LOG.info("Edge Server started successfully");
}

// 启动服务
startEdgeServer().catch((error) => {
  console.error("Failed to start edge server:", error);
  process.exit(1);
});
