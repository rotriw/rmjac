import { io, Socket } from "socket.io-client";
import * as openpgp from "openpgp";
import { handle_problem } from "./router";
import { verifyApiKey } from "./vjudge/codeforces/service/verify";
import { verifyAtcoderUser } from "./vjudge/atcoder/service/verify";
import { Problem } from "./declare/problem";

async function auth(socket: Socket<any>) {
    console.log(123);
    const message = await openpgp.createCleartextMessage({
        text: `Rotriw_Edge_Server_${socket.id || ""}`
    });
    console.log(123);
    const signingKeys = await openpgp.decryptKey({
        privateKey: await openpgp.readPrivateKey({ armoredKey: global.PRIVATE_KEY }),
        passphrase: global.PRIVATE_PWD
    });
    let msg = await openpgp.sign({
        message,
        signingKeys,
    });
    socket.emit("auth", msg);
}

export async function connect() {
    const socket = io(global.SERVER_URL);
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

    socket.on("create_problem_statement", (url: string) => {
    });

    socket.on("task", async (data: any) => {
        console.log(data);
        if (data.operation === "add_problem") {
            LOG.info(`Received update_problem_statement for ${data.url}`);
            let res = await handle_problem(data.url) as Problem;
            res.creation_time = new Date().toISOString().slice(0, -1);
            console.log(JSON.stringify(res));
            socket.emit("create_problem", res)
        }
    });

    socket.on(
        "verify_codeforces",
        async (data: { handle: string; apiKey: string; apiSecret: string }) => {
            try {
                const user = await verifyApiKey(
                    data.handle,
                    data.apiKey,
                    data.apiSecret,
                );
                socket.emit("verify_codeforces_response", {
                    success: true,
                    user,
                });
            } catch (e: any) {
                socket.emit("verify_codeforces_response", {
                    success: false,
                    error: e.message,
                });
            }
        },
    );

    socket.on(
        "verify_atcoder",
        async (data: { handle: string; expectedTopcoderId: string }) => {
            try {
                const success = await verifyAtcoderUser(
                    data.handle,
                    data.expectedTopcoderId,
                );
                socket.emit("verify_atcoder_response", { success });
            } catch (e: any) {
                socket.emit("verify_atcoder_response", {
                    success: false,
                    error: e.message,
                });
            }
        },
    );
}