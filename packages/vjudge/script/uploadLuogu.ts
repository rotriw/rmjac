import { io, Socket } from "socket.io-client";
import * as openpgp from "openpgp";
import fs from "node:fs";
import path from "node:path";
import Progress from "progress";
import { Problem, ProblemStatement } from "../declare/problem.ts";

const NDJSON_DIRS = (process.env.LUOGU_NDJSON_DIRS || "./data/luogu/parsed")
	.split(",")
	.map((item) => item.trim())
	.filter(Boolean);
const UPLOADED_FILE = process.env.LUOGU_UPLOADED_FILE || "./data/luogu/uploaded.txt";
const CONCURRENT_LIMIT = Number(process.env.LUOGU_UPLOAD_CONCURRENCY || 2);

let socket: Socket | null = null;
let isAuthenticated = false;

function loadUploadedRecords(): Set<string> {
	const uploaded = new Set<string>();
	if (fs.existsSync(UPLOADED_FILE)) {
		const content = fs.readFileSync(UPLOADED_FILE, "utf-8");
		content.split("\n").forEach((line) => {
			if (line.trim()) uploaded.add(line.trim());
		});
	}
	return uploaded;
}

function saveUploadedRecord(problemIden: string) {
	fs.mkdirSync(path.dirname(UPLOADED_FILE), { recursive: true });
	fs.appendFileSync(UPLOADED_FILE, problemIden + "\n");
}

function getNdjsonFiles(): string[] {
	const files: string[] = [];

	for (const dir of NDJSON_DIRS) {
		if (!fs.existsSync(dir)) {
			console.log(`目录不存在，跳过: ${dir}`);
			continue;
		}

		const items = fs.readdirSync(dir);
		for (const item of items) {
			if (item.endsWith(".ndjson") || item.endsWith(".jsonl")) {
				files.push(path.join(dir, item));
			}
		}
	}

	return files.sort();
}

function parseNumber(value: unknown): number | null {
	if (typeof value === "number" && Number.isFinite(value)) return value;
	if (typeof value === "string") {
		const match = value.match(/([0-9]+(\.[0-9]+)?)/);
		if (match) return Number(match[1]);
	}
	return null;
}

function normalizeTimeLimit(value: unknown): number {
	const num = parseNumber(value);
	if (num === null) return 0;
	if (num <= 50) return Math.round(num * 1000);
	return Math.round(num);
}

function normalizeMemoryLimit(value: unknown): number {
	const num = parseNumber(value);
	if (num === null) return 0;
	if (num <= 2048) return Math.round(num * 1024);
	return Math.round(num);
}

function extractMarkdown(raw: any): string {
	if (!raw) return "";
	if (typeof raw === "string") return raw;
	if (typeof raw.markdown === "string") return raw.markdown;
	if (typeof raw.statement_markdown === "string") return raw.statement_markdown;
	if (typeof raw.statement === "string") return raw.statement;
	if (raw.statement && typeof raw.statement === "object") {
		if (typeof raw.statement.markdown === "string") return raw.statement.markdown;
		if (typeof raw.statement.content === "string") return raw.statement.content;
	}
	if (typeof raw.description === "string") return raw.description;
	if (typeof raw.content === "string") return raw.content;
	return "";
}

function extractSamples(raw: any): [string, string][] {
	if (!raw) return [];
	const samples: [string, string][] = [];

	if (Array.isArray(raw.samples)) {
		for (const sample of raw.samples) {
			if (!sample) continue;
			const input =
				sample.input ??
				sample.in ??
				sample.input_data ??
				sample.sample_input ??
				"";
			const output =
				sample.output ??
				sample.out ??
				sample.output_data ??
				sample.sample_output ??
				"";
			samples.push([String(input ?? ""), String(output ?? "")]);
		}
	} else if (raw.sample_input || raw.sample_output) {
		samples.push([String(raw.sample_input ?? ""), String(raw.sample_output ?? "")]);
	}

	return samples;
}

function normalizeProblem(raw: any): Problem | null {
	if (!raw || typeof raw !== "object") return null;

	const problemIden =
		raw.problem_iden ||
		raw.id ||
		raw.pid ||
		raw.problemId ||
		raw.problem_id ||
		raw.iden;
	if (!problemIden) return null;

	const problemName =
		raw.problem_name ||
		raw.title ||
		raw.name ||
		raw.problemTitle ||
		raw.display_name ||
		`${problemIden}`;

	const markdown = extractMarkdown(raw);
	const pageSource = `<markdown_render>${markdown}`;

	const timeLimit = normalizeTimeLimit(
		raw.time_limit || raw.timeLimit || raw.time || raw.limit?.time
	);
	const memoryLimit = normalizeMemoryLimit(
		raw.memory_limit || raw.memoryLimit || raw.memory || raw.limit?.memory
	);

	const statement: ProblemStatement = {
		statement_source: "luogu",
		problem_source: "luogu",
		page_source: pageSource,
		iden: String(problemIden),
		problem_statements: [],
		time_limit: timeLimit,
		memory_limit: memoryLimit,
		sample_group: extractSamples(raw),
		show_order: [],
		problem_difficulty: raw.difficulty ?? raw.problem_difficulty ?? null,
		page_rendered: null,
		judge_option: raw.judge_option ?? {},
	};

	return {
		problem_iden: String(problemIden),
		problem_name: String(problemName),
		problem_statement: [statement],
		creation_time: raw.creation_time || new Date().toISOString(),
		tags: Array.isArray(raw.tags) ? raw.tags : [],
		user_id: raw.user_id ?? 1,
	};
}

function readProblemsFromFile(filePath: string): Problem[] {
	const problems: Problem[] = [];
	const content = fs.readFileSync(filePath, "utf-8");
	const lines = content.split("\n");

	for (const line of lines) {
		if (!line.trim()) continue;
		try {
			const raw = JSON.parse(line);
			const problem = normalizeProblem(raw);
			if (!problem) {
				console.warn(`跳过无效题目行: ${line.substring(0, 80)}...`);
				continue;
			}
			problems.push(problem);
		} catch (_e) {
			console.error(`解析NDJSON失败: ${line.substring(0, 80)}...`);
		}
	}

	return problems;
}

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
			text: `Rotriw_Edge_Server_${sock.id || ""}`,
		});

		const signingKeys = await openpgp.decryptKey({
			privateKey: await openpgp.readPrivateKey({ armoredKey: privateKeyArmored }),
			passphrase: privateKeyPwd,
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

		setTimeout(() => {
			if (!isAuthenticated) {
				console.error("认证超时");
				resolve(false);
			}
		}, 10000);
	});
}

function uploadProblem(sock: Socket, problem: Problem): Promise<boolean> {
	return new Promise((resolve) => {
		const done: Problem = {
			problem_iden: problem.problem_iden,
			problem_name: problem.problem_name,
			problem_statement: problem.problem_statement.map((ps) => {
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
					page_rendered: ps.page_rendered ?? null,
					problem_difficulty: ps.problem_difficulty,
					judge_option: ps.judge_option,
				};
			}),
			user_id: problem.user_id,
			creation_time: undefined,
			tags: problem.tags,
		};

		sock.emit("fetch_done_success", done);
		resolve(true);
	});
}

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

		setTimeout(() => {
			if (!sock.connected) {
				sock.close();
				reject(new Error("连接超时"));
			}
		}, 10000);
	});
}

async function main() {
	console.log("开始上传洛谷题目到主服务器...\n");

	const uploadedSet = loadUploadedRecords();
	console.log(`已上传题目数: ${uploadedSet.size}`);

	const files = getNdjsonFiles();
	console.log(`找到NDJSON文件数: ${files.length}`);

	if (files.length === 0) {
		console.log("没有需要上传的文件");
		return;
	}

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

	try {
		socket = await connectToServer();
	} catch (e) {
		console.error("无法连接到服务器:", e);
		return;
	}

	const authSuccess = await authenticate(socket);
	if (!authSuccess) {
		console.error("认证失败，退出");
		socket.close();
		return;
	}

	const bar = new Progress(":bar :current/:total :etas :token1", {
		total: allProblems.length,
		width: 40,
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
			if (result) successCount++;
			else failedCount++;
		}
	}

	console.log("\n上传完成:");
	console.log(`  成功: ${successCount}`);
	console.log(`  失败: ${failedCount}`);

	socket.close();
	console.log("已断开服务器连接");
}

main().catch((e) => {
	console.error("发生错误:", e);
	if (socket) socket.close();
});
