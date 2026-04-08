import { io, Socket } from "socket.io-client";
import * as openpgp from "openpgp";
import fs from "node:fs";
import { load_handlers } from "./index.ts";

// deno-lint-ignore no-explicit-any
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

// deno-lint-ignore require-await
export async function connect() {
    LOG.info(`Connecting to server at ${SERVER_URL}...`);
    const socket = io(SERVER_URL);
    socket.on("connect", async () => {
        LOG.info("start to auth.");
        load_handlers();
        auth(socket);
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
    global.socket = socket;
}