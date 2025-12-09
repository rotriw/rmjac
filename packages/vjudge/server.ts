import { io, Socket } from "socket.io-client";
import * as openpgp from "openpgp";
import { handle_problem } from "./router";
import { verifyApiKey } from "./vjudge/codeforces/service/verify";
import { verifyAtcoderUser } from "./vjudge/atcoder/service/verify";
import { Problem } from "./declare/problem";
import fs from "node:fs";
import { createRequire } from "node:module";
import { log } from "node:console";
const require = createRequire(import.meta.url);

// const { io, Socket } = require("socket.io-client");
// const openpgp = require("openpgp");
// const fs = require("fs");
// const { handle_problem } = require("./router");
// const { verifyApiKey } = require("./vjudge/codeforces/service/verify");
// const { verifyAtcoderUser } = require("./vjudge/atcoder/service/verify");
// const { Problem } = require("./declare/problem");

async function auth(socket: Socket<any>) {
    const message = await openpgp.createCleartextMessage({
        text: `Rotriw_Edge_Server_${socket.id || ""}`
    });
    const signingKeys = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: global.PRIVATE_KEY }),
        passphrase: globalThis.PRIVATE_PWD
    });
    let msg = await openpgp.sign({
        message,
        signingKeys,
    });
    socket.emit("auth", msg);
}

export async function connect() {
    const socket = io(globalThis.SERVER_URL);
    socket.on("connect", async () => {
        LOG.info("start to auth.");
        await auth(socket);
    });

    socket.on("auth_response", (data: string) => {
        if (data.match("success")) {
            LOG.info("Auth Success.");
        } else {
            LOG.error("Auth Failed.");
        }
    });

    socket.on("disconnect", () => {
        LOG.warn("Disconnected from server.");
        // retry connection
        setTimeout(() => {
            socket.connect();
        }, 1000);
    });

    // socket.on("create_problem_statement", (url: string) => {});
    const tasks = fs.readdirSync("./tasks");
    // deno-lint-ignore no-explicit-any
    const taskMap: Record<string, (task: any, socket: Socket) => Promise<void>> = {};
    for (const task of tasks) {
        const func = (await import(`./tasks/${task}`))["run"];
        taskMap[task.split(".")[0]] = func;
        globalThis.LOG.info(`Loaded task: ${task} operation = ${task.split(".")[0]}`);
    }
    
    // deno-lint-ignore no-explicit-any
    socket.on("task", async (data: any) => {
        console.log(data);
        await taskMap[data.operation](data, socket);
    });
}