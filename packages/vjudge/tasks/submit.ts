import { VjudgeSubmitFunction } from "../declare/modules.ts";
import { VjudgeNode } from "../declare/node.ts";

interface SubmitData {
    handle: string;
    platform: string;
    vjudge_node: VjudgeNode;
    token: string;
    contest_id: string;
    problem_id: string;
    code: string;
    language: string;
}

const run = async (data: SubmitData) => {
    const { handle, token, contest_id, problem_id, code, language, platform, vjudge_node } = data;
    const submit_method = vjudge_node.public.remote_mode === "PublicAccount" ? "PUBLIC" : vjudge_node.public.remote_mode === "SyncCode" ? "APIKEY" : vjudge_node.private.auth.token ? "TOKEN" : "PASSWORD";
    if (VJUDGE_USER[platform][`submit${submit_method}`]) {
        return await (VJUDGE_USER[platform][`submit${submit_method}`] as VjudgeSubmitFunction)(handle, vjudge_node.private.auth, contest_id, problem_id, code, language);
    }
    return null;
}