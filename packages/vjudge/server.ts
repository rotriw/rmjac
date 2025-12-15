import { io, Socket } from "socket.io-client";
import * as openpgp from "openpgp";
import fs from "node:fs";

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

export async function connect() {
    const socket = io(SERVER_URL);
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

    const tasks = fs.readdirSync("./tasks");
    // deno-lint-ignore no-explicit-any
    const taskMap: Record<string, (task: any, socket: Socket) => Promise<void>> = {};
    for (const task of tasks) {
        const func = (await import(`./tasks/${task}`))["run"];
        taskMap[task.split(".")[0]] = func;
        LOG.info(`Loaded task: ${task} operation`);
    }
    
    // deno-lint-ignore no-explicit-any
    socket.on("task", async (data: any) => {
        console.log(data);
        if (typeof data === "string") {
            data = JSON.parse(data);
        }
        await taskMap[data.operation](data, socket);
    });
}