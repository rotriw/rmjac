import { z } from "npm:zod";
import { SyncTaskData } from "../../declare/task.ts";
import { UniversalSubmission } from "../../declare/submission.ts";

/**
 * 洛谷提交记录的 API 响应格式
 * https://www.luogu.com.cn/record/list?user={uid}&page={page}
 */

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

// 定义提交记录的 Schema
const submissionSchema = z.object({
    id: z.number(),
    status: z.number(),
    problem: z.object({
        pid: z.string(),
        title: z.string(),
        difficulty: z.number().optional(),
    }),
    language: z.number(),
    submitTime: z.number(),
    time: z.number().nullable().optional(),
    memory: z.number().nullable().optional(),
    score: z.number().nullable().optional(),
});

const recordListSchema = z.object({
    currentTemplate: z.string().optional(),
    currentData: z.object({
        records: z.object({
            result: z.array(submissionSchema),
        }),
    }),
});

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

const API_URL = "https://www.luogu.com.cn/record/list";

interface LuoguAuthCookies {
    uid?: string;
    clientId?: string;
}

function parseAuthToken(token?: string): LuoguAuthCookies {
    if (!token) return {};
    const [uid, clientId] = token.split(":");
    return { uid, clientId };
}

async function fetchUserSubmissions(
    userHandle: string,
    auth: LuoguAuthCookies,
    page: number = 1
): Promise<z.infer<typeof submissionSchema>[]> {
    const url = `${API_URL}?user=${userHandle}&page=${page}&_contentOnly=1`;
    
    const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
    };

    if (auth.uid && auth.clientId) {
        headers["Cookie"] = `_uid=${auth.uid}; __client_id=${auth.clientId}`;
    }

    try {
        const res = await fetch(url, { headers });
        if (!res.ok) {
            throw new Error(`HTTP error! status: ${res.status} ${await res.text()}`);
        }
        const data = await res.json();
        const validatedData = recordListSchema.parse(data);
        return validatedData.currentData.records.result;
    } catch (error) {
        console.error(`Error fetching submissions for Luogu user ${userHandle}:`, error);
        throw error;
    }
}

async function fetchAllSubmissions(
    userHandle: string,
    auth: LuoguAuthCookies,
    maxPages: number = 100
): Promise<z.infer<typeof submissionSchema>[]> {
    const allSubmissions: z.infer<typeof submissionSchema>[] = [];
    
    for (let page = 1; page <= maxPages; page++) {
        try {
            const submissions = await fetchUserSubmissions(userHandle, auth, page);
            if (submissions.length === 0) break;
            allSubmissions.push(...submissions);
            
            // 简单的速率限制
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`Error fetching page ${page}:`, error);
            break;
        }
    }
    
    return allSubmissions;
}

function mapSubmissionToUniversal(s: z.infer<typeof submissionSchema>): UniversalSubmission {
    const status = convertLuoguStatus(s.status);
    const language = LuoguLanguageMap[s.language] || `Lang${s.language}`;
    
    return {
        remote_id: s.id,
        remote_platform: "luogu",
        remote_problem_id: s.problem.pid,
        language,
        code: "[archive]",  // 洛谷 API 不提供代码
        status,
        message: "",
        score: s.score || 0,
        submit_time: new Date(s.submitTime * 1000).toISOString(),
        url: `https://www.luogu.com.cn/record/${s.id}`,
        passed: [],  // 详细测试点信息需要单独获取
    };
}

export const token = async (task: SyncTaskData): Promise<{ event: string; data: UniversalSubmission[] }> => {
    const handle = task.vjudge_node.public.iden;
    const authToken = task.vjudge_node.private.auth && "Token" in task.vjudge_node.private.auth
        ? task.vjudge_node.private.auth.Token
        : "";
    const auth = parseAuthToken(authToken);
    
    try {
        let submissions: z.infer<typeof submissionSchema>[];
        
        if (task.range === "all") {
            submissions = await fetchAllSubmissions(handle, auth);
        } else {
            const page = task.range ? parseInt(task.range.split(":")[0]) || 1 : 1;
            submissions = await fetchUserSubmissions(handle, auth, page);
        }
        
        const mappedSubmissions = submissions.map(mapSubmissionToUniversal);
        
        return {
            event: "sync_done_success",
            data: mappedSubmissions,
        };
    } catch (e) {
        console.error(e);
        return {
            event: "sync_done_failed",
            data: [],
        };
    }
};

export const password = async (task: SyncTaskData): Promise<{ event: string; data: UniversalSubmission[] }> => {
    // 密码模式下，需要先登录获取 token
    // 这里暂时使用相同的逻辑，实际需要登录后使用 cookies
    return token(task);
};

export const only = async (task: SyncTaskData): Promise<{ event: string; data: UniversalSubmission[] }> => {
    // 仅同步模式，不需要认证
    return token(task);
};
