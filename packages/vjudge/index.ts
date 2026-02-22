import log4js from "log4js";
import * as server from "./server.ts";
import * as fs from "node:fs";
import process from "node:process";


declare global {
    var LOG: log4js.Logger;
    // deno-lint-ignore no-explicit-any
    var socket: import("socket.io-client").Socket<any>;
    var PRIVATE_KEY: string;
    var PRIVATE_PWD: string;
    var SERVER_URL: string;
    // deno-lint-ignore no-explicit-any
    var taskHandlerMap: Record<string, Record<string, (task: any) => Promise<any>>>;
}

async function start_service() {
    LOG.info("Service Start.");
    global.PRIVATE_KEY = fs.readFileSync(process.env.PRIVATE_PATH || "./private.asc").toString();
    global.PRIVATE_PWD = process.env.PRIVATE_PWD || "";
    global.SERVER_URL = process.env.SERVER_URL || "http://localhost:1825/vjudge";
    await server.connect();
}

export async function load_handlers() {
    for (const file of fs.readdirSync("./src/handlers")) {
        if (file.endsWith(".ts") || file.endsWith(".js")) {
            const handler = await import(`./src/handlers/${file}`);
            LOG.info(`Loaded handler: ${file}`);
            await handler.apply();
        }
    }
}

const logger = log4js.getLogger();
global.LOG = logger;
global.LOG.level = process.env.LOG_LEVEL || "debug";
await start_service();