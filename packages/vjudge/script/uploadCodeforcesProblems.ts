import { io, Socket } from "socket.io-client";
import * as openpgp from "openpgp";
import fs from "node:fs";
import path from "node:path";
import Progress from "progress";
import { Problem } from "../declare/problem.ts";

// 配置
const PARSED_DIRS = [
    "./data/codeforces/handled/parsed",
    "./data/codeforces/handled2/parsed",
    "./data/codeforces/handled3/parsed",
    "./data/codeforces/handled5/parsed",
];
const UPLOADED_FILE = "./data/codeforces/uploaded.txt";
const CONCURRENT_LIMIT = 2;

// 全局变量
let socket: Socket | null = null;
let isAuthenticated = false;

// 读取已上传的记录
function loadUploadedRecords(): Set<string> {
    const uploaded = new Set<string>();
    if (fs.existsSync(UPLOADED_FILE)) {
        const content = fs.readFileSync(UPLOADED_FILE, "utf-8");
        content.split("\n").forEach(line => {
            if (line.trim()) {
                uploaded.add(line.trim());
            }
        });
    }
    return uploaded;
}

// 保存上传记录
function saveUploadedRecord(problemIden: string) {
    fs.appendFileSync(UPLOADED_FILE, problemIden + "\n");
}

// 获取所有待上传的JSONL文件
function getJsonlFiles(): string[] {
    const files: string[] = [];
    
    for (const dir of PARSED_DIRS) {
        if (!fs.existsSync(dir)) {
            console.log(`目录不存在，跳过: ${dir}`);
            continue;
        }
        
        const items = fs.readdirSync(dir);
        for (const item of items) {
            if (item.endsWith(".jsonl")) {
                files.push(path.join(dir, item));
            }
        }
    }
    
    return files.sort();
}

// 读取JSONL文件中的所有题目
function readProblemsFromFile(filePath: string): Problem[] {
    const problems: Problem[] = [];
    const content = fs.readFileSync(filePath, "utf-8");
    const lines = content.split("\n");
    
    for (const line of lines) {
        if (line.trim()) {
            try {
                const problem = JSON.parse(line) as Problem;
                problems.push(problem);
            } catch (e) {
                console.error(`解析JSON失败: ${line.substring(0, 100)}...`);
            }
        }
    }
    
    return problems;
}

// 认证
async function authenticate(sock: Socket): Promise<boolean> {
    return new Promise(async (resolve) => {
        const privateKeyPath = process.env.PRIVATE_PATH || "./private.asc";
        const privateKeyPwd = process.env.PRIVATE_PWD || "";
        
        if (!fs.existsSync(privateKeyPath)) {
            console.error(`私钥文件不存在: ${privateKeyPath}`);
            resolve(false);
            return;
        }
        
        const privateKeyArmored = fs.readFileSync(privateKeyPath).toString();
        
        const message = await openpgp.createCleartextMessage({
            text: `Rotriw_Edge_Server_${sock.id || ""}`
        });
        
        const signingKeys = await openpgp.decryptKey({
            privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
            passphrase: privateKeyPwd
        });
        
        const msg = await openpgp.sign({
            message,
            signingKeys,
        });
        
        sock.once("auth_response", (data: string) => {
            if (data.includes("success")) {
                console.log("认证成功");
                isAuthenticated = true;
                resolve(true);
            } else {
                console.error("认证失败:", data);
                resolve(false);
            }
        });
        
        sock.emit("auth", msg);
        
        // 超时处理
        setTimeout(() => {
            if (!isAuthenticated) {
                console.error("认证超时");
                resolve(false);
            }
        }, 10000);
    });
}

// 上传单个题目
function uploadProblem(sock: Socket, problem: Problem): Promise<boolean> {
    return new Promise((resolve) => {
    let done: Problem = {
        problem_iden: problem.problem_iden,
        problem_name: problem.problem_name,
        problem_statement: problem.problem_statement.map(ps => {
            return {
                statement_source: ps.statement_source,
                iden: ps.iden,
                problem_statements: ps.problem_statements,
                time_limit: ps.time_limit,
                memory_limit: ps.memory_limit,
                sample_group: ps.sample_group,
                show_order: ps.show_order,
                page_source: ps.page_source,
                problem_source: ps.problem_source,
                page_rendered: null,
                problem_difficulty: ps.problem_difficulty,
                judge_option: ps.judge_option,
            }
        }),
        user_id: problem.user_id,
        creation_time: undefined,
        tags: problem.tags,
    };
    sock.emit("fetch_done_success", done);
        resolve(true);
    });
}

// 连接到服务器
function connectToServer(): Promise<Socket> {
    return new Promise((resolve, reject) => {
        const serverUrl = process.env.SERVER_URL || "http://localhost:1825/vjudge";
        console.log(`正在连接到服务器: ${serverUrl}`);
        
        const sock = io(serverUrl);
        
        sock.on("connect", () => {
            console.log("已连接到服务器");
            resolve(sock);
        });
        
        sock.on("connect_error", (error) => {
            console.error("连接错误:", error.message);
            reject(error);
        });
        
        // 超时处理
        setTimeout(() => {
            if (!sock.connected) {
                sock.close();
                reject(new Error("连接超时"));
            }
        }, 10000);
    });
}

async function main() {
    console.log("开始上传Codeforces题目到主服务器...\n");
    
    // 加载已上传记录
    const uploadedSet = loadUploadedRecords();
    console.log(`已上传题目数: ${uploadedSet.size}`);
    
    // 获取所有JSONL文件
    const files = getJsonlFiles();
    console.log(`找到JSONL文件数: ${files.length}`);
    
    if (files.length === 0) {
        console.log("没有需要上传的文件");
        return;
    }
    
    // 收集所有待上传的题目
    const allProblems: Problem[] = [];
    for (const file of files) {
        const problems = readProblemsFromFile(file);
        for (const problem of problems) {
            if (!uploadedSet.has(problem.problem_iden)) {
                allProblems.push(problem);
            }
        }
    }
    
    console.log(`待上传题目数: ${allProblems.length}`);
    
    if (allProblems.length === 0) {
        console.log("所有题目已上传");
        return;
    }
    
    // 连接服务器
    try {
        socket = await connectToServer();
    } catch (e) {
        console.error("无法连接到服务器:", e);
        return;
    }
    
    // 认证
    const authSuccess = await authenticate(socket);
    if (!authSuccess) {
        console.error("认证失败，退出");
        socket.close();
        return;
    }
    
    // 上传题目
    const bar = new Progress(':bar :current/:total :etas :token1', { 
        total: allProblems.length, 
        width: 40 
    });
    
    let successCount = 0;
    let failedCount = 0;
    
    for (let i = 0; i < allProblems.length; i += CONCURRENT_LIMIT) {
        const batch = allProblems.slice(i, i + CONCURRENT_LIMIT);
        const results = await Promise.all(
            batch.map(async (problem) => {
                const success = await uploadProblem(socket!, problem);
                if (success) {
                    saveUploadedRecord(problem.problem_iden);
                    uploadedSet.add(problem.problem_iden);
                }
                bar.tick(1, { token1: problem.problem_iden });
                return success;
            })
        );
        
        for (const result of results) {
            if (result) {
                successCount++;
            } else {
                failedCount++;
            }
        }
    }
    
    console.log("\n上传完成:");
    console.log(`  成功: ${successCount}`);
    console.log(`  失败: ${failedCount}`);
    
    // 关闭连接
    socket.close();
    console.log("已断开服务器连接");
}

main().catch((e) => {
    console.error("发生错误:", e);
    if (socket) {
        socket.close();
    }
});