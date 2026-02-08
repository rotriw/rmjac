import { getOnePage } from "../../service/browser.ts";
import { VjudgeNode } from "../../declare/node.ts";

/**
 * 洛谷提交代码功能
 * 需要用户已登录并获取到有效的 cookie
 */

// 洛谷语言 ID 映射（从前端选择的语言到洛谷语言ID）
const LanguageToLuoguId: Record<string, number> = {
    "Auto": 0,
    "Pascal": 1,
    "C": 2,
    "C++": 3,
    "C++11": 4,
    "C++14": 5,
    "C++17": 6,
    "C++14 (GCC 9)": 5,
    "C++20": 12,
    "C++23": 12,
    "Python 3": 7,
    "PyPy 3": 8,
    "Python 2": 11,
    "Java 8": 27,
    "Java 21": 27,
    "Node.js LTS": 28,
};

export const submit = async (task: {
    vjudge_node: VjudgeNode;
    context: {
        code: string;
        record_id: string;
    };
    url: string;  // 格式: problem_id 如 "P1001"
    language_id: string;
}): Promise<{
    event: string;
    data: {
        success: boolean;
        record_id: number;
        remote_url: string;
        message: string;
    };
}> => {
    try {
        const handle = task.vjudge_node.public.iden;
        const token = task.vjudge_node.private.auth.Token;
        const problemId = task.url;
        const code = task.context.code;
        const languageId = LanguageToLuoguId[task.language_id] || 0;

        if (!token) {
            return {
                event: "submit_done",
                data: {
                    success: false,
                    record_id: +task.context.record_id,
                    remote_url: "",
                    message: "Submit failed: No authentication token",
                },
            };
        }

        const [uid, clientId] = token.split(":");
        if (!uid || !clientId) {
            return {
                event: "submit_done",
                data: {
                    success: false,
                    record_id: +task.context.record_id,
                    remote_url: "",
                    message: "Submit failed: Invalid token format",
                },
            };
        }

        const browser = await getOnePage(`luogu-${handle}`);
        const page = await browser.newPage();

        // 设置登录 cookies
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

        // 导航到题目页面
        await page.goto(`https://www.luogu.com.cn/problem/${problemId}`, { 
            waitUntil: "domcontentloaded" 
        });

        // 等待页面加载
        await new Promise(resolve => setTimeout(resolve, 2000));

        // 获取 CSRF Token
        const csrfToken = await page.evaluate(() => {
            const metaTag = document.querySelector("meta[name='csrf-token']");
            return metaTag?.getAttribute("content") || "";
        });

        if (!csrfToken) {
            await page.close();
            return {
                event: "submit_done",
                data: {
                    success: false,
                    record_id: +task.context.record_id,
                    remote_url: "",
                    message: "Submit failed: Could not get CSRF token",
                },
            };
        }

        // 使用 API 提交代码
        const submitUrl = `https://www.luogu.com.cn/fe/api/problem/submit/${problemId}`;
        const submitData = {
            code,
            lang: languageId,
            enableO2: 0,  // 可以根据需要启用 O2 优化
        };

        const response = await page.evaluate(async (url: string, data: any, csrf: string) => {
            const res = await fetch(url, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": csrf,
                },
                body: JSON.stringify(data),
            });
            return await res.json();
        }, submitUrl, submitData, csrfToken);

        await page.close();

        if (response.rid) {
            const remoteUrl = `https://www.luogu.com.cn/record/${response.rid}`;
            return {
                event: "submit_done",
                data: {
                    success: true,
                    record_id: +task.context.record_id,
                    remote_url: remoteUrl,
                    message: "Submitted",
                },
            };
        } else {
            return {
                event: "submit_done",
                data: {
                    success: false,
                    record_id: +task.context.record_id,
                    remote_url: "",
                    message: `Submit failed: ${response.errorMessage || JSON.stringify(response)}`,
                },
            };
        }
    } catch (e) {
        return {
            event: "submit_done",
            data: {
                success: false,
                record_id: +task.context.record_id,
                remote_url: "",
                message: `Submit failed: ${(e as Error).message || e}`,
            },
        };
    }
};
