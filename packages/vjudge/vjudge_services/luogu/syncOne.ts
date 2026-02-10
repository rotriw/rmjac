import { getOnePage } from "../../service/browser.ts";
import { UniversalSubmission } from "../../declare/submission.ts";
import { VjudgeNode } from "../../declare/node.ts";
import { JSDOM } from "jsdom";

// 洛谷评测状态映射
const LuoguStatusMap: Record<number, string> = {
    0: "Waiting",
    1: "Judging",
    2: "Compile Error",
    3: "Output Limit Exceeded",
    4: "Memory Limit Exceeded",
    5: "Time Limit Exceeded",
    6: "Wrong Answer",
    7: "Runtime Error",
    11: "Unknown Error",
    12: "Accepted",
    14: "Unknown Error",
};

const convertLuoguStatus = (status: number): string => {
    return LuoguStatusMap[status] || "Unknown Error";
};

interface LuoguRecordDetail {
    id: number;
    status: number;
    problem: {
        pid: string;
        title: string;
    };
    language: number;
    submitTime: number;
    time?: number;
    memory?: number;
    score?: number;
    sourceCode?: string;
    detail?: {
        compileResult?: {
            success: boolean;
            message?: string;
        };
        judgeResult?: {
            subtasks?: Array<{
                id: number;
                score: number;
                time: number;
                memory: number;
                status: number;
                testCases?: Array<{
                    id: number;
                    score: number;
                    time: number;
                    memory: number;
                    status: number;
                }>;
            }>;
        };
    };
}

// 洛谷语言 ID 映射
const LuoguLanguageMap: Record<number, string> = {
    0: "Auto",
    1: "Pascal",
    2: "C",
    3: "C++",
    4: "C++11",
    5: "C++14",
    6: "C++17",
    7: "Python 3",
    8: "PyPy 3",
    11: "Python 2",
    12: "Python 2",
    27: "Java",
    28: "Node.js",
};

async function fetchSubmissionWithBrowser(
    handle: string,
    token: string,
    recordId: string,
): Promise<UniversalSubmission> {
    const [uid, clientId] = token.split(":");
    const url = `https://www.luogu.com.cn/record/${recordId}?_contentOnly=1`;
    
    const browser = await getOnePage(`luogu-${handle}`);
    const page = await browser.newPage();

    if (uid && clientId) {
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
    }

    await page.goto(url, { waitUntil: "domcontentloaded" });
    const content = await page.content();
    await page.close();

    // 解析 JSON 内容
    const dom = new JSDOM(content);
    const preElement = dom.window.document.querySelector("pre");
    if (!preElement) {
        throw new Error("Failed to get record data");
    }

    const data = JSON.parse(preElement.textContent || "{}");
    const record: LuoguRecordDetail = data.currentData?.record;
    
    if (!record) {
        throw new Error("Record not found in response");
    }

    const status = convertLuoguStatus(record.status);
    const language = LuoguLanguageMap[record.language] || `Lang${record.language}`;
    
    // 处理测试点信息
    const passed: [string, string, number, number, number][] = [];
    if (record.detail?.judgeResult?.subtasks) {
        for (const subtask of record.detail.judgeResult.subtasks) {
            if (subtask.testCases) {
                for (const tc of subtask.testCases) {
                    passed.push([
                        `${subtask.id}-${tc.id}`,
                        convertLuoguStatus(tc.status),
                        tc.score || 0,
                        tc.memory || 0,
                        tc.time || 0,
                    ]);
                }
            } else {
                passed.push([
                    `${subtask.id}`,
                    convertLuoguStatus(subtask.status),
                    subtask.score || 0,
                    subtask.memory || 0,
                    subtask.time || 0,
                ]);
            }
        }
    }

    return {
        remote_id: record.id,
        remote_platform: "luogu",
        remote_problem_id: record.problem.pid,
        language,
        code: record.sourceCode || "[hidden]",
        status,
        message: record.detail?.compileResult?.message || "",
        score: record.score || 0,
        submit_time: new Date(record.submitTime * 1000).toISOString(),
        url: `https://www.luogu.com.cn/record/${record.id}`,
        passed,
    };
}

async function fetchSubmissionWithAPI(
    recordId: string,
    token?: string,
): Promise<UniversalSubmission> {
    const url = `https://www.luogu.com.cn/record/${recordId}?_contentOnly=1`;
    
    const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    };

    if (token) {
        const [uid, clientId] = token.split(":");
        if (uid && clientId) {
            headers["Cookie"] = `_uid=${uid}; __client_id=${clientId}`;
        }
    }

    const res = await fetch(url, { headers });
    if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
    }

    const data = await res.json();
    const record: LuoguRecordDetail = data.currentData?.record;
    
    if (!record) {
        throw new Error("Record not found in response");
    }

    const status = convertLuoguStatus(record.status);
    const language = LuoguLanguageMap[record.language] || `Lang${record.language}`;
    
    // 处理测试点信息
    const passed: [string, string, number, number, number][] = [];
    if (record.detail?.judgeResult?.subtasks) {
        for (const subtask of record.detail.judgeResult.subtasks) {
            if (subtask.testCases) {
                for (const tc of subtask.testCases) {
                    passed.push([
                        `${subtask.id}-${tc.id}`,
                        convertLuoguStatus(tc.status),
                        tc.score || 0,
                        tc.memory || 0,
                        tc.time || 0,
                    ]);
                }
            } else {
                passed.push([
                    `${subtask.id}`,
                    convertLuoguStatus(subtask.status),
                    subtask.score || 0,
                    subtask.memory || 0,
                    subtask.time || 0,
                ]);
            }
        }
    }

    return {
        remote_id: record.id,
        remote_platform: "luogu",
        remote_problem_id: record.problem.pid,
        language,
        code: record.sourceCode || "[hidden]",
        status,
        message: record.detail?.compileResult?.message || "",
        score: record.score || 0,
        submit_time: new Date(record.submitTime * 1000).toISOString(),
        url: `https://www.luogu.com.cn/record/${record.id}`,
        passed,
    };
}

export const token = async (task: {
    vjudge_node: VjudgeNode;
    info: string;
    url: string;
}): Promise<{ event: string; data: UniversalSubmission[] } | null> => {
    const handle = task.vjudge_node.public.iden;
    const auth = task.vjudge_node.private.auth;

    if (task?.url) {
        try {
            // 从 URL 中提取记录 ID
            const urlObj = new URL(task.url);
            const paths = urlObj.pathname.split("/");
            const recordId = paths[paths.length - 1];
            const token = auth && "Token" in auth ? auth.Token : "";

            const result = await fetchSubmissionWithBrowser(handle, token, recordId);
            return {
                event: "sync_done_success",
                data: [result],
            };
        } catch (e) {
            console.error("Error fetching luogu submission:", e);
            return {
                event: "sync_done_failed",
                data: [],
            };
        }
    }
    return null;
};

export const password = async (task: {
    vjudge_node: VjudgeNode;
    info: string;
    url: string;
}): Promise<{ event: string; data: UniversalSubmission[] } | null> => {
    return token(task);
};

export const only = async (task: {
    vjudge_node: VjudgeNode;
    info: string;
    url: string;
}): Promise<{ event: string; data: UniversalSubmission[] } | null> => {
    // 不需要认证的获取
    if (task?.url) {
        try {
            const urlObj = new URL(task.url);
            const paths = urlObj.pathname.split("/");
            const recordId = paths[paths.length - 1];
            
            const result = await fetchSubmissionWithAPI(recordId);
            return {
                event: "sync_done_success",
                data: [result],
            };
        } catch (e) {
            console.error("Error fetching luogu submission:", e);
            return {
                event: "sync_done_failed",
                data: [],
            };
        }
    }
    return null;
};
