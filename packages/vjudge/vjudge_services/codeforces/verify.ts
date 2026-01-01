import { VerifyTaskData } from "@/declare/task.ts";
import { verifyApiKey } from "./service/verify.ts";

export const apikey = async (task: VerifyTaskData) => {
    const [apiKey, apiSecret] = (task.vjudge_node.private.auth.token || ":").split(":");
    const res = await verifyApiKey(task.vjudge_node.public.iden, apiKey, apiSecret);
    console.log(res);
    let verified = false;
    if (res.handle === task.vjudge_node.public.iden) {
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