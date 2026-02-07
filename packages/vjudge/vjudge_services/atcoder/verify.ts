import { VerifyTaskData } from "../../declare/task.ts";
import { getOnePage } from "../../service/browser.ts";
import { loginWithPassword } from "./syncOne.ts";

async function checkTokenLogin(token: string | undefined): Promise<boolean> {
    if (!token) return false;
    const browser = await getOnePage(`at-${token}`);
    const page = await browser.newPage();
    await browser.setCookie({
        name: "REVEL_SESSION",
        value: token,
        domain: "atcoder.jp",
        path: "/",
        expires: -1,
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
    } as any);

    await page.goto("https://atcoder.jp/settings", { waitUntil: "domcontentloaded" });
    const url = page.url();
    await page.close();
    return !url.includes("/login");
}

export const token = async (task: VerifyTaskData) => {
    const token = task.vjudge_node.private.auth.Token;
    const verified = await checkTokenLogin(token);
    return {
        event: "verified_done_success",
        data: {
            node_id: task.vjudge_node.node_id,
            result: verified,
            ws_id: task.ws_id,
        },
    };
};

export const password = async (task: VerifyTaskData) => {
    const password = task.vjudge_node.private.auth.Password;
    const res = await loginWithPassword(task.vjudge_node.public.iden, password || "");
    const verified = res !== false && res !== "";
    return {
        event: "verified_done_success",
        data: {
            node_id: task.vjudge_node.node_id,
            result: verified,
            ws_id: task.ws_id,
        },
    };
};

export const only = async (task: VerifyTaskData) => {
    return {
        event: "verified_done_success",
        data: {
            node_id: task.vjudge_node.node_id,
            result: true,
            ws_id: task.ws_id,
        },
    };
};
