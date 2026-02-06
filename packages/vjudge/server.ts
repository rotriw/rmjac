import { io, Socket } from "socket.io-client";
import * as openpgp from "openpgp";
import fs from "node:fs";
import { task_handler } from "./task_handler.ts";
import { VJUDGE_PLATFORMS } from "./declare/platforms.ts";

async function auth(socket: Socket<any>) {
    const message = await openpgp.createCleartextMessage({
        text: `Rotriw_Edge_Server_${socket.id || ""}`
    });
    const signingKeys = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: PRIVATE_KEY }),
        passphrase: PRIVATE_PWD
    });
    const msg = await openpgp.sign({
        message,
        signingKeys,
    });
    socket.emit("auth", msg);
}

const OPERATION_PREFIXES = ["syncList", "syncOne", "syncAll", "submit", "verify", "fetch", "track"];

function splitOperation(key: string): { operation: string; method: string } {
    for (const prefix of OPERATION_PREFIXES) {
        if (key.startsWith(prefix)) {
            return { operation: prefix, method: key.slice(prefix.length) };
        }
    }
    return { operation: key, method: "" };
}

function buildServiceList() {
    const services: Array<{ platform: string; operation: string; method?: string }> = [];
    if (!global.taskHandlerMap) {
        return services;
    }
    for (const [platform, handlers] of Object.entries(global.taskHandlerMap)) {
        for (const key of Object.keys(handlers)) {
            const { operation, method } = splitOperation(key);
            services.push({
                platform,
                operation,
                method: method || undefined,
            });
        }
    }
    return services;
}

export async function connect() {
    const socket = io(SERVER_URL);
    socket.on("connect", async () => {
        LOG.info("start to auth.");
        await auth(socket);
    });

    socket.on("auth_response", (data: string) => {
        if (data.match("success")) {
            LOG.info("Auth Success.");
            const services = buildServiceList();
            if (services.length > 0) {
                socket.emit("register_services", services);
            }
            if (VJUDGE_PLATFORMS.length > 0) {
                socket.emit("register_platforms", VJUDGE_PLATFORMS);
            }
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

    // deno-lint-ignore no-explicit-any
    socket.on("task", async (data: any) => { try {
        console.log(data);
        if (typeof data === "string") {
            data = JSON.parse(data);
        }
        await task_handler(data, socket as any);
    } catch(err) {
        LOG.error(`Task handling error: ${err}`);
    }
    });

    global.socket = socket;
}