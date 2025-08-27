import { io, Socket } from "socket.io-client";
import * as openpgp from "openpgp";
import { handle_problem } from "./router";

async function auth(socket: Socket<any>) {
    const message = await openpgp.createCleartextMessage({
        text: `Rotriw_Edge_Server_${socket.id || ""}`
    });
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
        LOG.info(`Received update_problem_statement for ${url}`);
        socket.emit("create_problem", handle_problem(url));
    });
}