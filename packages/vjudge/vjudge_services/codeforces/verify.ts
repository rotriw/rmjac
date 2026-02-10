import { VerifyTaskData } from "@/declare/task.ts";
import { verifyApiKey } from "./service/verify.ts";
import { checkLoginWithToken, loginWithPassword } from "./service/submission.ts";
import { resolve6 } from "node:dns";

export const apikey = async (task: VerifyTaskData) => {
    const auth = task.vjudge_node.private.auth;
    const tokenStr = auth && "Token" in auth ? auth.Token : "";
    const [apiKey, apiSecret] = (tokenStr || ":").split(":");
    const res = await verifyApiKey(task.vjudge_node.public.iden, apiKey, apiSecret);
    return {
        event: "verified_done_success",
        data: {
            node_id: task.vjudge_node.node_id,
            result: res,
            ws_id: task.ws_id
        }
    };
}

export const password = async (task: VerifyTaskData) => {
    const auth = task.vjudge_node.private.auth;
    const password = auth && "Password" in auth ? auth.Password : "";
    const res = await loginWithPassword(task.vjudge_node.public.iden, password || "");
    let verified = false;
    if (res !== "") {
        verified = true;
    }
    return {
        event: "verified_done_success",
        data: {
            node_id: task.vjudge_node.node_id,
            result: verified,
            ws_id: task.ws_id
        }
    };
}

export const token = async (task: VerifyTaskData) => {
    const auth = task.vjudge_node.private.auth;
    const token = auth && "Token" in auth ? auth.Token : "";
    const res = await checkLoginWithToken(task.vjudge_node.public.iden, token || "");
    return {
        event: "verified_done_success",
        data: {
            node_id: task.vjudge_node.node_id,
            result: res,
            ws_id: task.ws_id
        }
    };
}