import log4js from "log4js";
import * as server from "./server.ts";
import * as fs from "node:fs";
import process from "node:process";
import { Problem } from "./declare/problem.ts";
import { VjudgeAuth } from "@/declare/node.ts";
import { VjudgeUser } from "@/declare/modules.ts";


declare global {
    var LOG: log4js.Logger;
    var PRIVATE_KEY: string;
    var PRIVATE_PWD: string;
    var SERVER_URL: string;
    var VJUDGE_USER: Record<string, VjudgeUser>;
    var VJUDGE_PROBLEM: Record<string, {
        fetch?: (url: string) => Promise<string>;
        parse?: (html: string, url: string) => Promise<Problem>;
    }>;
}

async function load_vjudge_module() {
    global.VJUDGE_USER = {};
    global.VJUDGE_PROBLEM = {};
    const vjudge_modules = fs.readdirSync("./vjudge");
    for (const module of vjudge_modules) {
        LOG.info(`Loading vjudge module: ${module}`);
        const user_module_func = (await import(`./vjudge/${module}/user.ts`));
        VJUDGE_USER[module] = user_module_func;
        const problem_module_func = (await import(`./vjudge/${module}/problem.ts`));
        VJUDGE_PROBLEM[module] = problem_module_func;
    }
}

async function start_service() {
    await load_vjudge_module();
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