import { Socket } from "socket.io-client";
import { VjudgeNode } from "@/declare/node.ts";
import { VjudgeVerifiedFunction } from "@/declare/modules.ts";

interface VerifyAccountData {
    vjudge_node: VjudgeNode;
    ws_id: string;
}

export const run = async (data: VerifyAccountData, socket: Socket) => {
    const { vjudge_node, ws_id } = data;
    const platform = vjudge_node.public.platform.toLowerCase();
    try {
        const vjudge_mode = vjudge_node.public.remote_mode;
        const vjudge_method = vjudge_mode === "PublicAccount" ? "PUBLIC" : vjudge_mode === "SyncCode" ? "APIKEY" :  vjudge_node.private.auth.token ? "TOKEN" : "PASSWORD";
        LOG.info(`Verifying ${vjudge_node.public.iden} with ${vjudge_method} platform: ${platform}`);
        if (!VJUDGE_USER[platform][`verified${vjudge_method}`]) {
            throw new Error("Verification method not found");
        }
        const result = await (VJUDGE_USER[platform][`verified${vjudge_method}`] as VjudgeVerifiedFunction)(vjudge_node.public.iden, vjudge_node.private.auth) || false;
        if (!result) {
            throw new Error("Verification failed");
        }
        socket.emit("verified_done", {
            node_id: vjudge_node.node_id,
            result: result || false,
            ws_id
        });
    } catch (e: any) {
        console.error("Verification failed:", e);
        socket.emit("verified_done", {
            node_id: vjudge_node.node_id,
            result: false,
            message: e.toString(),
            ws_id
        });
    }
};