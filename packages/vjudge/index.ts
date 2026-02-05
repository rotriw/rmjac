import log4js from "log4js";
import * as server from "./server.ts";
import * as fs from "node:fs";
import process from "node:process";
import { Problem } from "./declare/problem.ts";


declare global {
    var LOG: log4js.Logger;
    var socket: import("socket.io-client").Socket<any>;
    var PRIVATE_KEY: string;
    var PRIVATE_PWD: string;
    var SERVER_URL: string;
    var taskHandlerMap: Record<string, Record<string, (task: any) => Promise<any>>>;
}

async function load_vjudge_services() {
    global.taskHandlerMap = {};
    if (!fs.existsSync("./vjudge_services")) return;
    const services = fs.readdirSync("./vjudge_services");
    for (const service of services) {
        if (fs.statSync(`./vjudge_services/${service}`).isDirectory()) {
            LOG.info(`Loading vjudge service: ${service}`);
            const { apply } = await import(`./vjudge_services/${service}/apply.ts`);
            if (apply) apply();
        }
    }
}

async function start_service() {
    await load_vjudge_services();
    LOG.info("Service Start.");
    global.PRIVATE_KEY = fs.readFileSync(process.env.PRIVATE_PATH || "./private.asc").toString();
    global.PRIVATE_PWD = process.env.PRIVATE_PWD || "";
    global.SERVER_URL = process.env.SERVER_URL || "http://localhost:1825/vjudge";
    server.connect();
}

const logger = log4js.getLogger();
global.LOG = logger;
global.LOG.level = process.env.LOG_LEVEL || "debug";
start_service();