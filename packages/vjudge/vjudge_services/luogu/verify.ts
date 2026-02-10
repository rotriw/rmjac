import { VerifyTaskData } from "../../declare/task.ts";
import { getOnePage } from "../../service/browser.ts";

/**
 * 洛谷账户验证 - 使用 Cookie Token 验证
 * 洛谷使用 _uid 和 __client_id cookie 进行身份验证
 */
async function checkTokenLogin(uid: string, clientId: string): Promise<boolean> {
    if (!uid || !clientId) return false;
    
    try {
        const browser = await getOnePage(`luogu-${uid}`);
        const page = await browser.newPage();
        
        await browser.setCookie(
            {
                name: "_uid",
                value: uid,
                domain: "www.luogu.com.cn",
                path: "/",
                expires: -1,
                secure: true,
                httpOnly: true,
                sameSite: "Lax",
            } as any,
            {
                name: "__client_id",
                value: clientId,
                domain: "www.luogu.com.cn",
                path: "/",
                expires: -1,
                secure: true,
                httpOnly: true,
                sameSite: "Lax",
            } as any
        );

        await page.goto("https://www.luogu.com.cn/user/setting", { waitUntil: "domcontentloaded" });
        const url = page.url();
        await page.close();
        
        // 如果重定向到登录页面，则验证失败
        return !url.includes("/auth/login");
    } catch (error) {
        console.error("Error checking luogu token login:", error);
        return false;
    }
}

/**
 * 使用用户名密码登录洛谷
 * 注意：洛谷登录可能需要滑块验证码
 */
export const loginWithPassword = async (handle: string, password: string): Promise<string | false> => {
    const url = "https://www.luogu.com.cn/auth/login";
    const browser = await getOnePage(`luogu-login-${handle}`);
    const page = await browser.newPage();
    
    try {
        await page.goto(url, { waitUntil: "domcontentloaded" });
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // 填写登录表单
        await page.type("input[name='username']", handle);
        await page.type("input[name='password']", password);
        await page.click("button[type='submit']");
        
        await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 10000 });
        
        // 获取 cookies
        const cookies = await browser.cookies();
        let uid = "";
        let clientId = "";
        
        for (const cookie of cookies) {
            if (cookie.name === "_uid") {
                uid = cookie.value;
            } else if (cookie.name === "__client_id") {
                clientId = cookie.value;
            }
        }
        
        await page.close();
        
        if (uid && clientId) {
            return `${uid}:${clientId}`;
        }
        return false;
    } catch (error) {
        console.error("Error logging into luogu:", error);
        await page.close();
        return false;
    }
};

export const token = async (task: VerifyTaskData) => {
    const auth = task.vjudge_node.private.auth;
    const tokenStr = auth && "Token" in auth ? auth.Token : "";
    const [uid, clientId] = tokenStr.split(":");
    const verified = await checkTokenLogin(uid, clientId);
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
    const auth = task.vjudge_node.private.auth;
    const password = auth && "Password" in auth ? auth.Password : "";
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
    // 仅同步模式，不需要验证账户
    return {
        event: "verified_done_success",
        data: {
            node_id: task.vjudge_node.node_id,
            result: true,
            ws_id: task.ws_id,
        },
    };
};
