import log4js from "log4js";
import * as dotenv from "dotenv";
import * as openpgp from 'openpgp';
import * as server from "./server";
import * as fs from "node:fs";

declare global {
    var LOG: log4js.Logger;
    var PRIVATE_KEY: string;
    var PRIVATE_PWD: string;
    var SERVER_URL: string;
}

async function start_service() {
    global.LOG.info("Service Start.");
    global.PRIVATE_KEY = fs.readFileSync(process.env.PRIVATE_PATH || "./private.asc").toString();
    global.PRIVATE_PWD = process.env.PRIVATE_PWD || "";
    global.SERVER_URL = process.env.SERVER_URL || "http://localhost:1825/vjudge";
    server.connect();
}

let logger = log4js.getLogger();
global.LOG = logger;
global.LOG.level = process.env.LOG_LEVEL || "debug";
start_service();