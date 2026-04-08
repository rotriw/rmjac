/**
 * 题目显示平台 — Express Server
 *
 * 基于 vjudge SQLite 数据库，提供题目浏览、搜索、API 接口。
 * 输出格式兼容 packages/core 的 Problem / ProblemStatement 结构。
 *
 * 启动: deno run -A server/app.ts [--port 3200] [--db data/vjudge.db]
 */

import express, { type Request, type Response, type NextFunction } from "npm:express@4";
import path from "node:path";
import axios from "axios";
import { getDbAsync, getDb, closeDb, queryAll, queryOne, saveDb } from "../db/connection.ts";
import { getStats } from "../db/schema.ts";
import { translateProblem, translateProblemStream, formalizeProblem, formalizeProblemStream } from "../db/pipeline.ts";
import { renderProblemPage, renderListPage, renderHomePage, renderApiDocsPage } from "./render.ts";
import { parse as parseCF } from "../vjudge_services/codeforces/parse.ts";
import { parse as parseAT } from "../vjudge_services/atcoder/parse.ts";
import { getPageContent } from "../service/browser.ts";
import type { Problem as LocalProblem } from "../declare/problem.ts";
import log4js from "log4js";

// 初始化全局 LOG（browser.ts 依赖）
if (!globalThis.LOG) {
  const logger = log4js.getLogger("server");
  logger.level = "info";
  (globalThis as any).LOG = logger;
}

// ============================================================
// 参数解析
// ============================================================

function parseArgs() {
  const args = typeof Deno !== "undefined" ? Deno.args : process.argv.slice(2);
  let port = 3200;
  let dbPath: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--port" || args[i] === "-p") port = parseInt(args[i + 1]) || 3200;
    if (args[i] === "--db") dbPath = args[i + 1];
  }
  return { port, dbPath };
}

const MAIN_SITE_BASE_URL = process.env.MAIN_SITE_BASE_URL || "http://localhost:1824";

type SidebarItem = {
  name: string;
  path: string;
  icon: string;
  active: boolean;
};

async function verifyMainSiteLogin(cookieHeader?: string): Promise<boolean> {
  if (!cookieHeader || !cookieHeader.trim()) {
    return false;
  }

  try {
    const resp = await fetch(`${MAIN_SITE_BASE_URL}/api/view/default/sidebar`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        cookie: cookieHeader,
      },
      body: JSON.stringify({ path: "problem" }),
    });

    if (!resp.ok) {
      return false;
    }

    const payload = await resp.json();
    const list = payload?.data as SidebarItem[] | undefined;
    if (!Array.isArray(list)) {
      return false;
    }

    const hasRecord = list.some((item) => item.path === "record");
    const hasLoginEntry = list.some((item) => item.path === "login");

    return hasRecord && !hasLoginEntry;
  } catch {
    return false;
  }
}

function toText(value: unknown): string | undefined {
  if (typeof value === "string") {
    const v = value.trim();
    return v.length > 0 ? v : undefined;
  }
  if (typeof value === "number") {
    return String(value);
  }
  return undefined;
}

function extractUidToken(req: Request): { uid?: string; token?: string } {
  const body = req.body && typeof req.body === "object" ? req.body as Record<string, unknown> : {};
  const query = req.query as Record<string, unknown>;

  const uid =
    toText(req.headers["x-uid"]) ||
    toText(req.headers["uid"]) ||
    toText(query.uid) ||
    toText(query.user_id) ||
    toText(body.uid) ||
    toText(body.user_id);

  const token =
    toText(req.headers["x-token"]) ||
    toText(req.headers["token"]) ||
    toText(query.token) ||
    toText(body.token);

  return { uid, token };
}

function buildAuthCookieHeader(req: Request): string | undefined {
  const { uid, token } = extractUidToken(req);
  if (uid && token) {
    return `_uid=${encodeURIComponent(uid)}; token=${encodeURIComponent(token)}`;
  }
  const rawCookie = req.headers.cookie;
  if (rawCookie && rawCookie.trim()) {
    return rawCookie;
  }
  return undefined;
}

async function requireMainLogin(req: Request, res: Response, next: NextFunction) {
  const cookieHeader = buildAuthCookieHeader(req);
  const ok = await verifyMainSiteLogin(cookieHeader);

  if (!ok) {
    res.status(401).json({
      error: "unauthorized",
      message: "请先登录主站后再使用翻译/形式化功能",
    });
    return;
  }

  next();
}

// ============================================================
// 通用格式转换 (兼容 packages/core)
// ============================================================

/**
 * 兼容 core 的 Problem 结构 (Rust serde 序列化格式)
 */
export interface CoreProblem {
  name: string;
  description: { content: string; description_type: "Markdown" | "Html" | "Typst" };
  platform: string;
  limit: { time_limit: number; memory_limit: number };  // ms / KB
  difficulty: { NumberStyle: number } | { LuoguStyle: string } | "None";
  is_remote: boolean;
  is_sync: boolean;
  sync_url: string | null;
  sign: string | null;
}

/**
 * 兼容 core 的 ProblemStatement 结构
 */
export interface CoreProblemStatement {
  statement_type: "Markdown" | "Html" | "Pdf" | "Typst";
  content: string;
  is_translate: boolean;
  language: "Chinese" | "English" | "Japanese" | "Russian";
}

interface ContentType { iden: string; content: string; }

const PLATFORM_MAP: Record<string, string> = {
  codeforces: "Codeforces", atcoder: "AtCoder", luogu: "Luogu",
};

function toCoreFormat(row: any): {
  problem: CoreProblem;
  statements: CoreProblemStatement[];
  meta: { iden: string; tags: string[]; sample_group: [string, string][]; created_at: string };
} {
  const rawStmts: ContentType[] = JSON.parse((row.raw_statement as string) || "[]");

  // --- Problem ---
  const descContent = (rawStmts.find(s => s.iden === "statement" || s.iden === "problem statement")?.content || "")
    .slice(0, 200).replace(/\n+/g, " ");

  const platform = PLATFORM_MAP[row.platform as string] || (row.platform as string);

  let difficulty: CoreProblem["difficulty"];
  if (row.difficulty != null && row.difficulty !== 0) {
    if (platform === "Luogu" && typeof row.difficulty === "number" && row.difficulty <= 7) {
      const styles = ["P0", "P1", "P2", "P3", "P4", "P5", "P6", "P7"];
      difficulty = { LuoguStyle: styles[row.difficulty as number] || "P0" };
    } else {
      difficulty = { NumberStyle: row.difficulty as number };
    }
  } else {
    difficulty = "None";
  }

  const problem: CoreProblem = {
    name: cleanName(row.name as string),
    description: { content: descContent, description_type: "Markdown" },
    platform,
    limit: {
      time_limit: (row.time_limit as number) || 2000,
      memory_limit: (row.memory_limit as number) || 262144,
    },
    difficulty,
    is_remote: true,
    is_sync: true,
    sync_url: null,
    sign: row.iden as string,
  };

  // --- Statements ---
  const statements: CoreProblemStatement[] = [];
  const rawContent = mergeStatements(rawStmts);
  if (rawContent) {
    statements.push({
      statement_type: "Markdown",
      content: rawContent.replace(/\n{3,}/g, "\n\n").trim(),
      is_translate: false,
      language: "English",
    });
  }

  if (row.translated_statement) {
    let translated: string;
    try {
      const parsed = JSON.parse(row.translated_statement as string);
      translated = Array.isArray(parsed) ? mergeStatements(parsed) : (row.translated_statement as string);
    } catch {
      translated = row.translated_statement as string;
    }
    if (translated) {
      statements.push({
        statement_type: "Markdown",
        content: translated.replace(/\n{3,}/g, "\n\n").trim(),
        is_translate: true,
        language: "Chinese",
      });
    }
  }

  // 形式化题面
  if (row.formal_statement) {
    statements.push({
      statement_type: "Markdown",
      content: (row.formal_statement as string).replace(/\n{3,}/g, "\n\n").trim(),
      is_translate: false,
      language: "Formal",
    });
  }

  // --- Meta ---
  let sampleGroup: [string, string][] = JSON.parse((row.sample_group as string) || "[]");

  // 如果 sample_group 为空，尝试从 raw_statement 中自动提取
  if (sampleGroup.length === 0) {
    sampleGroup = extractSamplesFromStatements(rawStmts);
  }

  const meta = {
    iden: row.iden as string,
    tags: JSON.parse((row.tags as string) || "[]"),
    sample_group: sampleGroup,
    created_at: (row.created_at as string) || "",
  };

  return { problem, statements, meta };
}

/** 判断一个 section iden 是否属于样例区域（应当被 [samples] 占位符替代） */
function isSampleSection(iden: string): boolean {
  const lower = iden.toLowerCase();
  return lower === "example" || lower === "examples"
    || lower.startsWith("sample")
    || lower === "render_html";
}

function mergeStatements(statements: ContentType[]): string {
  if (!statements?.length) return "";

  const ORDER: Record<string, number> = {
    "statement": 0, "problem statement": 0,
    "constraints": 1, "input": 2, "output": 3, "note": 10,
  };

  // 过滤掉样例 section
  const filtered = statements.filter(s => !isSampleSection(s.iden));

  const sorted = [...filtered].sort((a, b) => {
    const oa = ORDER[a.iden] ?? 8;
    const ob = ORDER[b.iden] ?? 8;
    return oa !== ob ? oa - ob : a.iden.localeCompare(b.iden);
  });

  const parts = sorted
    .filter(s => s.content?.trim())
    .map(s => {
      if (s.iden === "statement" || s.iden === "problem statement") return s.content;
      const title = s.iden.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return `## ${title}\n\n${s.content}`;
    });

  // 在 Output 之后（Note 之前）插入 [samples] 占位符
  const outputIdx = parts.findIndex(p => p.startsWith("## Output"));
  const noteIdx = parts.findIndex(p => p.startsWith("## Note"));
  let insertAt: number;
  if (outputIdx >= 0) {
    insertAt = outputIdx + 1;
  } else if (noteIdx >= 0) {
    insertAt = noteIdx;
  } else {
    insertAt = parts.length;
  }
  parts.splice(insertAt, 0, "\n\n[samples]\n\n");

  return parts.join("\n\n");
}

/**
 * 从 raw_statement 中提取样例输入/输出对
 * 支持两种常见格式：
 * 1. AtCoder 风格: "sample input 1" / "sample output 1" 的 iden
 * 2. CF 的 "example" section 内容（纯文本 Input/Output 块）
 */
function extractSamplesFromStatements(stmts: ContentType[]): [string, string][] {
  const pairs: [string, string][] = [];

  // 方式1: AtCoder 风格 — 匹配 "sample input N" / "sample output N"
  const inputs = stmts.filter(s => /^sample\s*input/i.test(s.iden)).sort((a, b) => a.iden.localeCompare(b.iden));
  const outputs = stmts.filter(s => /^sample\s*output/i.test(s.iden)).sort((a, b) => a.iden.localeCompare(b.iden));

  if (inputs.length > 0 && inputs.length === outputs.length) {
    for (let i = 0; i < inputs.length; i++) {
      const inp = inputs[i].content.trim();
      const out = outputs[i].content.trim();
      if (inp && out) pairs.push([inp, out]);
    }
    return pairs;
  }

  // 方式2: CF 风格 — "example"/"examples" section 中解析 Input/Output 块
  const exampleSection = stmts.find(s => /^examples?$/i.test(s.iden));
  if (exampleSection?.content) {
    const content = exampleSection.content;
    // 匹配 "Input\n...\nOutput\n..." 模式
    const blocks = content.split(/\n*(?:Input|输入)\s*\n/i).slice(1);
    for (const block of blocks) {
      const outSplit = block.split(/\n*(?:Output|输出)\s*\n/i);
      if (outSplit.length >= 2) {
        const inp = outSplit[0].trim();
        const out = outSplit[1].trim();
        if (inp && out) pairs.push([inp, out]);
      }
    }
  }

  return pairs;
}

function cleanName(name: string): string {
  return name.replace(/\n\t+Editorial$/i, "").replace(/\s+Editorial$/i, "").trim();
}

/**
 * 通过代理浏览器获取页面内容（绕过 Cloudflare 等反爬）
 * 使用 puppeteer-real-browser，与原有 vjudge 抓取逻辑一致
 * 支持自动重试
 */
async function fetchWithBrowser(url: string, maxRetries = 2): Promise<string> {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const html = await getPageContent(url, true, "server");
    if (html && html.length > 200 && !html.includes("Just a moment...")) {
      return html;
    }
    if (attempt < maxRetries) {
      console.log(`[Fetch] 重试 (${attempt + 1}/${maxRetries}): ${url}`);
      await new Promise(r => setTimeout(r, 3000 * (attempt + 1)));
    }
  }
  throw new Error("浏览器获取页面为空（已重试）");
}

/** 简单 axios GET（用于不需要浏览器的场景，如 AtCoder / CF API） */
async function fetchWithAxios(url: string): Promise<string> {
  const resp = await axios.get(url, {
    timeout: 15000,
    headers: {
      "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
      "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  return resp.data;
}

// ============================================================
// Express App
// ============================================================

const app = express();
app.use(express.json());

// --- CORS (允许前端跨域访问 API) ---
app.use((_req: Request, res: Response, next: NextFunction) => {
  const origin = _req.headers.origin;
  if (origin) {
    res.header("Access-Control-Allow-Origin", origin);
    res.header("Vary", "Origin");
    res.header("Access-Control-Allow-Credentials", "true");
  } else {
    res.header("Access-Control-Allow-Origin", "*");
  }
  res.header("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, X-UID, X-TOKEN, UID, TOKEN, Authorization");
  if (_req.method === "OPTIONS") { res.sendStatus(204); return; }
  next();
});

app.use("/api/translate", requireMainLogin);
app.use("/api/formalize", requireMainLogin);

// --- Static assets (KaTeX, etc.) ---
app.use("/static", express.static(path.resolve(import.meta.dirname || ".", "static")));

// ============================================================
// API Routes
// ============================================================

/**
 * GET /api/problems
 * 题目列表（分页 + 筛选）
 */
app.get("/api/problems", (req: Request, res: Response) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  const platform = req.query.platform as string || "";
  const search = req.query.search as string || "";

  let where = "1=1";
  const params: any[] = [];

  if (platform) {
    where += " AND p.platform = ?";
    params.push(platform.toLowerCase());
  }
  if (search) {
    where += " AND (p.iden LIKE ? OR p.name LIKE ?)";
    params.push(`%${search}%`, `%${search}%`);
  }

  const countRow = queryOne(db, `SELECT COUNT(*) as total FROM problems p WHERE ${where}`, params);
  const total = (countRow?.total as number) || 0;

  const rows = queryAll(db, `
    SELECT p.iden, p.name, p.platform, p.difficulty, p.time_limit, p.memory_limit, p.tags
    FROM problems p
    WHERE ${where}
    ORDER BY p.iden
    LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  const items = rows.map(r => ({
    iden: r.iden,
    name: cleanName(r.name as string),
    platform: PLATFORM_MAP[r.platform as string] || r.platform,
    difficulty: r.difficulty,
    time_limit: r.time_limit,
    memory_limit: r.memory_limit,
    tags: JSON.parse((r.tags as string) || "[]"),
  }));

  res.json({
    total,
    page,
    limit,
    total_pages: Math.ceil(total / limit),
    items,
  });
});

/**
 * 根据各种可能的 iden 格式生成候选 iden 列表
 * 支持:
 *   - 直接 iden (如 abc296_g)
 *   - sign 格式 (如 ATabc296G → abc296_g)
 *   - 路径格式 (如 atcoder/abc296/G → abc296_g)
 *   - CF 格式 (如 CF1923A → cf1923a)
 */
function generateIdenCandidates(iden: string): string[] {
  const candidates = [iden];
  const lower = iden.toLowerCase();
  if (lower !== iden) candidates.push(lower);

  // AT sign 格式: ATabc296G → abc296_g, ATabc296Ex → abc296_ex
  const atSignMatch = iden.match(/^AT([a-z0-9_-]+?)([A-Z][a-z0-9]*)$/i);
  if (atSignMatch) {
    const contestId = atSignMatch[1].toLowerCase();
    const problemIndex = atSignMatch[2].toLowerCase();
    candidates.push(`${contestId}_${problemIndex}`);
  }

  // 路径格式: atcoder/abc296/G → abc296_g
  const pathMatch = iden.match(/^(?:atcoder\/)?([a-z0-9_-]+)\/([a-zA-Z][a-z0-9]*)$/i);
  if (pathMatch) {
    const contestId = pathMatch[1].toLowerCase();
    const problemIndex = pathMatch[2].toLowerCase();
    candidates.push(`${contestId}_${problemIndex}`);
  }

  // CF sign 格式: CF1923A → cf1923a
  const cfSignMatch = iden.match(/^CF(\d+)([A-Z]\d*)$/i);
  if (cfSignMatch) {
    candidates.push(`cf${cfSignMatch[1]}${cfSignMatch[2]}`.toLowerCase());
  }

  return [...new Set(candidates)];
}

/**
 * GET /api/problems/:iden
 * 题目详情（core 兼容格式）
 * 支持精确匹配 + 模糊匹配回退
 */
app.get("/api/problems/:iden", (req: Request, res: Response) => {
  const db = getDb();
  const { iden } = req.params;

  // 1. 先尝试精确匹配（包括各种格式转换后的候选）
  const candidates = generateIdenCandidates(iden);
  let row: any = null;
  for (const candidate of candidates) {
    row = queryOne(db, `
      SELECT p.*, t.translated_statement, f.formal_statement
      FROM problems p
      LEFT JOIN translations t ON p.iden = t.iden
      LEFT JOIN formalizations f ON p.iden = f.iden
      WHERE p.iden = ?
    `, [candidate]);
    if (row) break;
  }

  // 2. 精确匹配失败，尝试模糊匹配
  if (!row) {
    // 提取模糊搜索关键词：用所有候选去 LIKE 查找
    const fuzzyTerms = [...new Set(candidates.flatMap(c => {
      // 把路径分隔符和下划线统一拆开作为关键词片段
      return c.split(/[\/_.]+/).filter(s => s.length > 0);
    }))];
    // 用关键词组合进行模糊匹配：所有片段都必须出现在 iden 中
    const fuzzyRow = (() => {
      if (fuzzyTerms.length === 0) return null;
      const whereClauses = fuzzyTerms.map(() => "p.iden LIKE ?");
      const whereParams = fuzzyTerms.map(t => `%${t.toLowerCase()}%`);
      return queryOne(db, `
        SELECT p.*, t.translated_statement, f.formal_statement
        FROM problems p
        LEFT JOIN translations t ON p.iden = t.iden
        LEFT JOIN formalizations f ON p.iden = f.iden
        WHERE ${whereClauses.join(" AND ")}
        LIMIT 1
      `, whereParams);
    })();
    if (fuzzyRow) row = fuzzyRow;
  }

  if (!row) {
    // 返回建议列表
    const likeParam = `%${iden.replace(/[\/]/g, "%")}%`;
    const matches = queryAll(db,
      `SELECT iden, name, platform FROM problems WHERE iden LIKE ? OR name LIKE ? LIMIT 10`,
      [likeParam, likeParam]);
    res.status(404).json({
      error: "not_found",
      message: `题目 ${iden} 不存在`,
      suggestions: matches.map((m: any) => ({ iden: m.iden, name: m.name, platform: m.platform })),
    });
    return;
  }

  const data = toCoreFormat(row);
  res.json(data);
});

/**
 * GET /api/problems/:iden/raw
 * 题目原始分段数据
 */
app.get("/api/problems/:iden/raw", (req: Request, res: Response) => {
  const db = getDb();
  const row = queryOne(db, `
    SELECT p.raw_statement, p.sample_group, p.show_order, p.page_source,
           t.translated_statement, f.formal_statement, f.simple_statement
    FROM problems p
    LEFT JOIN translations t ON p.iden = t.iden
    LEFT JOIN formalizations f ON p.iden = f.iden
    WHERE p.iden = ?
  `, [req.params.iden]);

  if (!row) {
    res.status(404).json({ error: "not_found" });
    return;
  }

  res.json({
    raw_statement: JSON.parse((row.raw_statement as string) || "[]"),
    translated_statement: (() => {
      try { return JSON.parse(row.translated_statement as string); } catch { return row.translated_statement; }
    })(),
    sample_group: JSON.parse((row.sample_group as string) || "[]"),
    show_order: JSON.parse((row.show_order as string) || "[]"),
    formal_statement: row.formal_statement || null,
    simple_statement: row.simple_statement || null,
    has_page_source: !!(row.page_source),
  });
});

/**
 * GET /api/stats
 * 数据库统计
 */
app.get("/api/stats", (_req: Request, res: Response) => {
  const db = getDb();
  const s = getStats(db);

  const translated = queryOne(db, "SELECT COUNT(*) as cnt FROM translations")?.cnt || 0;
  const formalized = queryOne(db, "SELECT COUNT(*) as cnt FROM formalizations WHERE formal_statement IS NOT NULL")?.cnt || 0;
  const simplified = queryOne(db, "SELECT COUNT(*) as cnt FROM formalizations WHERE simple_statement IS NOT NULL")?.cnt || 0;
  const embedded = queryOne(db, "SELECT COUNT(*) as cnt FROM embeddings")?.cnt || 0;

  res.json({
    problems: s.problems,
    translations: translated,
    formalizations: formalized,
    simplifications: simplified,
    embeddings: embedded,
    platforms: s.platforms,
  });
});

/**
 * GET /api/platforms
 * 平台列表
 */
app.get("/api/platforms", (_req: Request, res: Response) => {
  const db = getDb();
  const rows = queryAll(db, "SELECT platform, COUNT(*) as count FROM problems GROUP BY platform ORDER BY count DESC");
  res.json(rows.map(r => ({
    id: r.platform,
    name: PLATFORM_MAP[r.platform as string] || r.platform,
    count: r.count,
  })));
});

// ============================================================
// 题面翻译
// ============================================================

/** 可选模型列表（后备，优先从 API 动态获取） */
const TRANSLATE_MODELS_FALLBACK = [
  { id: "qwen/qwen3-next-80b-a3b-instruct", name: "Qwen3 Next 80B" },
  { id: "deepseek-ai/deepseek-v3.1", name: "DeepSeek V3.1" },
  { id: "gemini-3-flash-preview", name: "Gemini 3 Flash" },
];

/** 模型 ID 黑名单（embedding 模型等不适合翻译的） */
const MODEL_BLACKLIST = new Set(["bge-m3"]);

/** 缓存动态获取的模型列表 */
let cachedModels: { id: string; name: string }[] | null = null;
let cacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 分钟缓存

async function fetchAvailableModels(): Promise<{ id: string; name: string }[]> {
  const now = Date.now();
  if (cachedModels && now - cacheTime < CACHE_TTL) return cachedModels;

  try {
    const apiKey = process.env.ONEAPI_KEY;
    const baseURL = process.env.ONEAPI_BASEURL || "https://oneapi.wanghu.rcfortress.site:8443/v1";
    if (!apiKey) return TRANSLATE_MODELS_FALLBACK;

    const resp = await fetch(`${baseURL}/models`, {
      headers: { Authorization: `Bearer ${apiKey}` },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) return TRANSLATE_MODELS_FALLBACK;

    const data = await resp.json();
    const models = (data.data || [])
      .map((m: any) => m.id as string)
      .filter((id: string) => !MODEL_BLACKLIST.has(id))
      .sort()
      .map((id: string) => {
        // 生成友好名称
        const name = id
          .replace(/^(deepseek-ai|qwen|google|openai|minimaxai|moonshotai)\//, "")
          .replace(/-/g, " ")
          .replace(/\b\w/g, c => c.toUpperCase());
        return { id, name };
      });

    cachedModels = models.length > 0 ? models : TRANSLATE_MODELS_FALLBACK;
    cacheTime = now;
    return cachedModels;
  } catch {
    return TRANSLATE_MODELS_FALLBACK;
  }
}

/**
 * GET /api/translate/models
 * 获取可用的翻译模型列表（动态从 OneAPI 获取）
 */
app.get("/api/translate/models", async (_req: Request, res: Response) => {
  const models = await fetchAvailableModels();
  res.json({ models });
});

/**
 * POST /api/translate
 * 翻译指定题目
 * Body: { iden: string, model?: string }
 */
app.post("/api/translate", async (req: Request, res: Response) => {
  try {
    const { iden, model } = req.body;
    if (!iden) {
      res.status(400).json({ error: "bad_request", message: "请提供 iden 参数" });
      return;
    }

    const db = getDb();
    // 通过候选 iden 查找实际 iden
    const candidates = generateIdenCandidates(iden);
    let realIden: string | null = null;
    for (const candidate of candidates) {
      const row = queryOne(db, "SELECT iden FROM problems WHERE iden = ?", [candidate]);
      if (row) { realIden = row.iden as string; break; }
    }
    // 模糊匹配回退
    if (!realIden) {
      const fuzzyTerms = [...new Set(candidates.flatMap(c =>
        c.split(/[\/_.]+/).filter(s => s.length > 0)
      ))];
      if (fuzzyTerms.length > 0) {
        const whereClauses = fuzzyTerms.map(() => "iden LIKE ?");
        const whereParams = fuzzyTerms.map(t => `%${t.toLowerCase()}%`);
        const row = queryOne(db, `SELECT iden FROM problems WHERE ${whereClauses.join(" AND ")} LIMIT 1`, whereParams);
        if (row) realIden = row.iden as string;
      }
    }

    if (!realIden) {
      res.status(404).json({ error: "not_found", message: `题目 ${iden} 不存在` });
      return;
    }

    const models = await fetchAvailableModels();
    const selectedModel = model || models[0]?.id || "qwen/qwen3-next-80b-a3b-instruct";
    console.log(`[Translate] 翻译 ${realIden}，模型: ${selectedModel}`);
    const ok = await translateProblem(realIden, selectedModel);

    if (!ok) {
      res.status(500).json({ error: "translate_failed", message: "翻译失败，可能无题面或 AI 服务异常" });
      return;
    }

    // 返回翻译后的完整题目数据
    const row = queryOne(db, `
      SELECT p.*, t.translated_statement, f.formal_statement
      FROM problems p
      LEFT JOIN translations t ON p.iden = t.iden
      LEFT JOIN formalizations f ON p.iden = f.iden
      WHERE p.iden = ?
    `, [realIden]);
    const data = toCoreFormat(row);
    res.json({ success: true, iden: realIden, model: selectedModel, data });
  } catch (e: any) {
    console.error("[Translate Error]", e);
    res.status(500).json({ error: "internal_error", message: e.message });
  }
});

/**
 * GET /api/translate/status/:iden
 * 查询翻译状态
 */
app.get("/api/translate/status/:iden", (req: Request, res: Response) => {
  const db = getDb();
  const candidates = generateIdenCandidates(req.params.iden);
  let statusRow: any = null;
  for (const candidate of candidates) {
    statusRow = queryOne(db, `SELECT * FROM process_status WHERE iden = ? AND operation = 'translate'`, [candidate]);
    if (statusRow) break;
  }
  const translationRow = (() => {
    for (const candidate of candidates) {
      const r = queryOne(db, `SELECT model, created_at FROM translations WHERE iden = ?`, [candidate]);
      if (r) return r;
    }
    return null;
  })();

  res.json({
    has_translation: !!translationRow,
    model: translationRow?.model || null,
    translated_at: translationRow?.created_at || null,
    process_status: statusRow?.status || null,
    error: statusRow?.error_message || null,
  });
});

/**
 * POST /api/translate/stream
 * 流式翻译 — 通过 SSE 推送 AI 的实时输出
 * Body: { iden: string, model?: string }
 */
app.post("/api/translate/stream", async (req: Request, res: Response) => {
  try {
    const { iden, model } = req.body;
    if (!iden) {
      res.status(400).json({ error: "bad_request", message: "请提供 iden 参数" });
      return;
    }

    const db = getDb();
    const candidates = generateIdenCandidates(iden);
    let realIden: string | null = null;
    for (const candidate of candidates) {
      const row = queryOne(db, "SELECT iden FROM problems WHERE iden = ?", [candidate]);
      if (row) { realIden = row.iden as string; break; }
    }
    if (!realIden) {
      const fuzzyTerms = [...new Set(candidates.flatMap(c =>
        c.split(/[\/_.]+/).filter(s => s.length > 0)
      ))];
      if (fuzzyTerms.length > 0) {
        const whereClauses = fuzzyTerms.map(() => "iden LIKE ?");
        const whereParams = fuzzyTerms.map(t => `%${t.toLowerCase()}%`);
        const row = queryOne(db, `SELECT iden FROM problems WHERE ${whereClauses.join(" AND ")} LIMIT 1`, whereParams);
        if (row) realIden = row.iden as string;
      }
    }
    if (!realIden) {
      res.status(404).json({ error: "not_found", message: `题目 ${iden} 不存在` });
      return;
    }

    const models = await fetchAvailableModels();
    const selectedModel = model || models[0]?.id || "qwen/qwen3-next-80b-a3b-instruct";
    console.log(`[Translate/Stream] 流式翻译 ${realIden}，模型: ${selectedModel}`);

    // 设置 SSE 头（注意：凭证请求不能使用 *）
    const origin = req.headers.origin;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Credentials": "true",
      "Vary": "Origin",
    });

    // 发送初始事件
    res.write(`data: ${JSON.stringify({ type: "start", iden: realIden, model: selectedModel })}\n\n`);

    const ok = await translateProblemStream(realIden, selectedModel, (delta, accumulated) => {
      try {
        res.write(`data: ${JSON.stringify({ type: "chunk", delta, length: accumulated.length })}\n\n`);
      } catch {}
    });

    if (ok) {
      // 翻译完成，返回完整数据
      const row = queryOne(db, `
        SELECT p.*, t.translated_statement, f.formal_statement
        FROM problems p
        LEFT JOIN translations t ON p.iden = t.iden
        LEFT JOIN formalizations f ON p.iden = f.iden
        WHERE p.iden = ?
      `, [realIden]);
      const data = toCoreFormat(row);
      res.write(`data: ${JSON.stringify({ type: "done", iden: realIden, model: selectedModel, data })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: "翻译失败，可能无题面或 AI 服务异常" })}\n\n`);
    }

    res.end();
  } catch (e: any) {
    console.error("[Translate/Stream Error]", e);
    try {
      res.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
      res.end();
    } catch {
      res.status(500).json({ error: "internal_error", message: e.message });
    }
  }
});

// ============================================================
// 形式化 API
// ============================================================

/**
 * GET /api/formalize/status/:iden
 * 查询形式化状态
 */
app.get("/api/formalize/status/:iden", (req: Request, res: Response) => {
  const db = getDb();
  const candidates = generateIdenCandidates(req.params.iden);
  let statusRow: any = null;
  for (const candidate of candidates) {
    statusRow = queryOne(db, `SELECT * FROM process_status WHERE iden = ? AND operation = 'formalize'`, [candidate]);
    if (statusRow) break;
  }
  const formalRow = (() => {
    for (const candidate of candidates) {
      const r = queryOne(db, `SELECT formal_model, formal_created_at FROM formalizations WHERE iden = ?`, [candidate]);
      if (r) return r;
    }
    return null;
  })();

  res.json({
    has_formalization: !!formalRow,
    model: formalRow?.formal_model || null,
    formalized_at: formalRow?.formal_created_at || null,
    process_status: statusRow?.status || null,
    error: statusRow?.error_message || null,
  });
});

/**
 * POST /api/formalize/stream
 * 流式形式化 — 通过 SSE 推送 AI 的实时输出
 * Body: { iden: string, model?: string }
 */
app.post("/api/formalize/stream", async (req: Request, res: Response) => {
  try {
    const { iden, model } = req.body;
    if (!iden) {
      res.status(400).json({ error: "bad_request", message: "请提供 iden 参数" });
      return;
    }

    const db = getDb();
    const candidates = generateIdenCandidates(iden);
    let realIden: string | null = null;
    for (const candidate of candidates) {
      const row = queryOne(db, "SELECT iden FROM problems WHERE iden = ?", [candidate]);
      if (row) { realIden = row.iden as string; break; }
    }
    if (!realIden) {
      const fuzzyTerms = [...new Set(candidates.flatMap(c =>
        c.split(/[\/_.]+/).filter(s => s.length > 0)
      ))];
      if (fuzzyTerms.length > 0) {
        const whereClauses = fuzzyTerms.map(() => "iden LIKE ?");
        const whereParams = fuzzyTerms.map(t => `%${t.toLowerCase()}%`);
        const row = queryOne(db, `SELECT iden FROM problems WHERE ${whereClauses.join(" AND ")} LIMIT 1`, whereParams);
        if (row) realIden = row.iden as string;
      }
    }
    if (!realIden) {
      res.status(404).json({ error: "not_found", message: `题目 ${iden} 不存在` });
      return;
    }

    const models = await fetchAvailableModels();
    const selectedModel = model || models[0]?.id || "qwen/qwen3-next-80b-a3b-instruct";
    console.log(`[Formalize/Stream] 流式形式化 ${realIden}，模型: ${selectedModel}`);

    // 设置 SSE 头（注意：凭证请求不能使用 *）
    const origin = req.headers.origin;
    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
      "Access-Control-Allow-Origin": origin || "*",
      "Access-Control-Allow-Credentials": "true",
      "Vary": "Origin",
    });

    // 发送初始事件
    res.write(`data: ${JSON.stringify({ type: "start", iden: realIden, model: selectedModel })}\n\n`);

    const ok = await formalizeProblemStream(realIden, selectedModel, (delta, accumulated) => {
      try {
        res.write(`data: ${JSON.stringify({ type: "chunk", delta, length: accumulated.length })}\n\n`);
      } catch {}
    });

    if (ok) {
      const row = queryOne(db, `
        SELECT f.formal_statement, f.formal_model, f.formal_created_at
        FROM formalizations f
        WHERE f.iden = ?
      `, [realIden]);
      res.write(`data: ${JSON.stringify({ type: "done", iden: realIden, model: selectedModel, formal_statement: row?.formal_statement || "" })}\n\n`);
    } else {
      res.write(`data: ${JSON.stringify({ type: "error", message: "形式化失败，可能无题面或 AI 服务异常" })}\n\n`);
    }

    res.end();
  } catch (e: any) {
    console.error("[Formalize/Stream Error]", e);
    try {
      res.write(`data: ${JSON.stringify({ type: "error", message: e.message })}\n\n`);
      res.end();
    } catch {
      res.status(500).json({ error: "internal_error", message: e.message });
    }
  }
});

// ============================================================
// 题目添加 — 从 Codeforces / AtCoder 抓取
// ============================================================

/**
 * 将 vjudge 本地 Problem 格式插入/更新到 SQLite
 */
function upsertProblem(localProblem: LocalProblem): { iden: string; action: "inserted" | "updated" } {
  const db = getDb();
  const stmt = localProblem.problem_statement[0];
  if (!stmt) throw new Error("No problem statement");

  const iden = localProblem.problem_iden;
  const existing = queryOne(db, "SELECT iden FROM problems WHERE iden = ?", [iden]);

  if (existing) {
    // 更新
    db.run(`UPDATE problems SET
      name = ?, raw_statement = ?, page_source = ?,
      time_limit = ?, memory_limit = ?, tags = ?, difficulty = ?,
      statement_source = ?, sample_group = ?, show_order = ?,
      judge_option = ?, updated_at = datetime('now')
    WHERE iden = ?`, [
      localProblem.problem_name,
      JSON.stringify(stmt.problem_statements || []),
      stmt.page_source || null,
      stmt.time_limit || null,
      stmt.memory_limit || null,
      JSON.stringify(localProblem.tags || []),
      stmt.problem_difficulty || null,
      stmt.statement_source || null,
      JSON.stringify(stmt.sample_group || []),
      JSON.stringify(stmt.show_order || []),
      JSON.stringify(stmt.judge_option || {}),
      iden,
    ]);
    saveDb();
    return { iden, action: "updated" };
  } else {
    // 插入
    db.run(`INSERT INTO problems
      (iden, name, platform, raw_statement, page_source,
       time_limit, memory_limit, tags, difficulty, creation_time,
       statement_source, sample_group, show_order, judge_option)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, [
      iden,
      localProblem.problem_name,
      stmt.problem_source?.toLowerCase() || "unknown",
      JSON.stringify(stmt.problem_statements || []),
      stmt.page_source || null,
      stmt.time_limit || null,
      stmt.memory_limit || null,
      JSON.stringify(localProblem.tags || []),
      stmt.problem_difficulty || null,
      localProblem.creation_time || new Date().toISOString(),
      stmt.statement_source || null,
      JSON.stringify(stmt.sample_group || []),
      JSON.stringify(stmt.show_order || []),
      JSON.stringify(stmt.judge_option || {}),
    ]);
    saveDb();
    return { iden, action: "inserted" };
  }
}

/**
 * 规范化 Codeforces URL
 * 支持: /problemset/problem/1/A, /contest/1/problem/A, /gym/100001/problem/A
 */
function normalizeCFUrl(url: string): string {
  // 已经是完整 URL
  if (url.startsWith("http")) return url;
  // 纯 iden 如 "CF1A" 或 "1A"
  const idenMatch = url.match(/^(?:CF)?(\d+)([A-Z]\d*)$/i);
  if (idenMatch) {
    return `https://codeforces.com/problemset/problem/${idenMatch[1]}/${idenMatch[2]}`;
  }
  return `https://codeforces.com${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * 规范化 AtCoder URL
 * 支持: /contests/abc300/tasks/abc300_a, abc300_a
 */
function normalizeATUrl(url: string): string {
  if (url.startsWith("http")) return url;
  // 纯题目 ID 如 "abc300_a"
  const taskMatch = url.match(/^([a-z0-9]+)_([a-z0-9]+)$/i);
  if (taskMatch) {
    return `https://atcoder.jp/contests/${taskMatch[1]}/tasks/${url}`;
  }
  return `https://atcoder.jp${url.startsWith("/") ? "" : "/"}${url}`;
}

/**
 * POST /api/fetch/codeforces
 * 从 Codeforces 抓取题目并添加到数据库
 *
 * Body: { url: string } 或 { urls: string[] }
 */
app.post("/api/fetch/codeforces", async (req: Request, res: Response) => {
  try {
    const urls: string[] = req.body.urls || (req.body.url ? [req.body.url] : []);
    if (!urls.length) {
      res.status(400).json({ error: "bad_request", message: "请提供 url 或 urls 参数" });
      return;
    }

    const results: { url: string; iden?: string; action?: string; error?: string }[] = [];

    for (const rawUrl of urls) {
      const url = normalizeCFUrl(rawUrl);
      try {
        console.log(`[Fetch CF] 通过浏览器抓取: ${url}`);
        const html = await fetchWithBrowser(url);
        const problem = await parseCF(html, url);
        if (!problem) {
          results.push({ url, error: "解析失败：无法提取题面" });
          continue;
        }
        const { iden, action } = upsertProblem(problem);
        console.log(`[Fetch CF] ${iden} ${action}`);
        results.push({ url, iden, action });
      } catch (e: any) {
        results.push({ url, error: e.message || String(e) });
      }
    }

    const success = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    res.json({ success, failed, results });
  } catch (e: any) {
    res.status(500).json({ error: "internal_error", message: e.message });
  }
});

/**
 * POST /api/fetch/atcoder
 * 从 AtCoder 抓取题目并添加到数据库
 *
 * Body: { url: string } 或 { urls: string[] }
 */
app.post("/api/fetch/atcoder", async (req: Request, res: Response) => {
  try {
    const urls: string[] = req.body.urls || (req.body.url ? [req.body.url] : []);
    if (!urls.length) {
      res.status(400).json({ error: "bad_request", message: "请提供 url 或 urls 参数" });
      return;
    }

    const results: { url: string; iden?: string; action?: string; error?: string }[] = [];

    for (const rawUrl of urls) {
      const url = normalizeATUrl(rawUrl);
      try {
        console.log(`[Fetch AT] 抓取: ${url}`);
        const html = await fetchWithAxios(url);
        const problem = await parseAT(html, url);
        if (!problem) {
          results.push({ url, error: "解析失败：无法提取题面" });
          continue;
        }
        const { iden, action } = upsertProblem(problem);
        console.log(`[Fetch AT] ${iden} ${action}`);
        results.push({ url, iden, action });
      } catch (e: any) {
        results.push({ url, error: e.message || String(e) });
      }
    }

    const success = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    res.json({ success, failed, results });
  } catch (e: any) {
    res.status(500).json({ error: "internal_error", message: e.message });
  }
});

/**
 * POST /api/fetch/codeforces/contest
 * 按 Codeforces contest ID 批量抓取整场比赛的所有题目
 *
 * Body: { contest_id: number }
 */
app.post("/api/fetch/codeforces/contest", async (req: Request, res: Response) => {
  try {
    const contestId = req.body.contest_id;
    if (!contestId) {
      res.status(400).json({ error: "bad_request", message: "请提供 contest_id" });
      return;
    }

    // 先通过 CF API 获取题目列表（API 不限制 UA）
    const apiUrl = `https://codeforces.com/api/contest.standings?contestId=${contestId}&from=1&count=1&showUnofficial=false`;
    const apiResp = await axios.get(apiUrl, { timeout: 15000 });
    if (apiResp.data.status !== "OK") {
      res.status(400).json({ error: "cf_api_error", message: apiResp.data.comment || "CF API 返回错误" });
      return;
    }

    const problems: { contestId: number; index: string; name: string; rating?: number }[] = apiResp.data.result.problems;
    const results: { url: string; iden?: string; action?: string; error?: string }[] = [];

    for (const p of problems) {
      const prefix = p.contestId < 100000 ? "contest" : "gym";
      const url = `https://codeforces.com/${prefix}/${p.contestId}/problem/${p.index}`;
      try {
        console.log(`[Fetch CF Contest] 通过浏览器抓取: ${url}`);
        const html = await fetchWithBrowser(url);
        const problem = await parseCF(html, url);
        if (!problem) {
          results.push({ url, error: "解析失败" });
          continue;
        }
        const { iden, action } = upsertProblem(problem);
        console.log(`[Fetch CF Contest] ${iden} ${action}`);
        results.push({ url, iden, action });
      } catch (e: any) {
        results.push({ url, error: e.message || String(e) });
      }
      // 浏览器抓取间隔
      await new Promise(r => setTimeout(r, 2000));
    }

    const success = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    res.json({ contest_id: contestId, total: problems.length, success, failed, results });
  } catch (e: any) {
    res.status(500).json({ error: "internal_error", message: e.message });
  }
});

/**
 * POST /api/fetch/atcoder/contest
 * 按 AtCoder contest ID 批量抓取整场比赛的所有题目
 *
 * Body: { contest_id: string }  e.g. "abc300"
 */
app.post("/api/fetch/atcoder/contest", async (req: Request, res: Response) => {
  try {
    const contestId = req.body.contest_id;
    if (!contestId) {
      res.status(400).json({ error: "bad_request", message: "请提供 contest_id (如 \"abc300\")" });
      return;
    }

    // 获取比赛任务列表页
    const tasksUrl = `https://atcoder.jp/contests/${contestId}/tasks`;
    let tasksHtml: string;
    try {
      tasksHtml = await fetchWithAxios(tasksUrl);
    } catch (e: any) {
      res.status(400).json({ error: "fetch_error", message: `无法获取比赛页: ${e.message}` });
      return;
    }

    // 从任务列表页提取题目链接
    const { JSDOM } = await import("jsdom");
    const dom = new JSDOM(tasksHtml);
    const doc = dom.window.document;
    const taskLinks: string[] = [];
    doc.querySelectorAll("table tbody tr td:first-child a").forEach((a: any) => {
      const href = a.getAttribute("href");
      if (href && href.includes("/tasks/")) {
        taskLinks.push(`https://atcoder.jp${href}`);
      }
    });

    if (!taskLinks.length) {
      res.status(400).json({ error: "no_tasks", message: `比赛 ${contestId} 未找到题目链接` });
      return;
    }

    const results: { url: string; iden?: string; action?: string; error?: string }[] = [];

    for (const url of taskLinks) {
      try {
        console.log(`[Fetch AT Contest] 抓取: ${url}`);
        const html = await fetchWithAxios(url);
        const problem = await parseAT(html, url);
        if (!problem) {
          results.push({ url, error: "解析失败" });
          continue;
        }
        const { iden, action } = upsertProblem(problem);
        console.log(`[Fetch AT Contest] ${iden} ${action}`);
        results.push({ url, iden, action });
      } catch (e: any) {
        results.push({ url, error: e.message || String(e) });
      }
      await new Promise(r => setTimeout(r, 1000));
    }

    const success = results.filter(r => !r.error).length;
    const failed = results.filter(r => r.error).length;
    res.json({ contest_id: contestId, total: taskLinks.length, success, failed, results });
  } catch (e: any) {
    res.status(500).json({ error: "internal_error", message: e.message });
  }
});

// ============================================================
// HTML 页面路由
// ============================================================

/**
 * 首页
 */
app.get("/", async (_req: Request, res: Response) => {
  const db = getDb();
  const s = getStats(db);
  res.type("html").send(renderHomePage(s));
});

/**
 * 题目列表页
 */
app.get("/problems", (req: Request, res: Response) => {
  const db = getDb();
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = 50;
  const offset = (page - 1) * limit;
  const platform = req.query.platform as string || "";
  const search = req.query.search as string || "";

  let where = "1=1";
  const params: any[] = [];
  if (platform) { where += " AND p.platform = ?"; params.push(platform.toLowerCase()); }
  if (search) { where += " AND (p.iden LIKE ? OR p.name LIKE ?)"; params.push(`%${search}%`, `%${search}%`); }

  const total = (queryOne(db, `SELECT COUNT(*) as cnt FROM problems p WHERE ${where}`, params)?.cnt as number) || 0;
  const rows = queryAll(db, `
    SELECT p.iden, p.name, p.platform, p.difficulty, p.time_limit, p.memory_limit
    FROM problems p WHERE ${where} ORDER BY p.iden LIMIT ? OFFSET ?
  `, [...params, limit, offset]);

  res.type("html").send(renderListPage(rows, { page, total, limit, platform, search }));
});

/**
 * 题目详情页
 */
app.get("/problem/:iden", (req: Request, res: Response) => {
  const db = getDb();
  const iden = req.params.iden;
  const candidates = generateIdenCandidates(iden);
  let row: any = null;
  for (const candidate of candidates) {
    row = queryOne(db, `
      SELECT p.*, t.translated_statement, f.formal_statement
      FROM problems p LEFT JOIN translations t ON p.iden = t.iden
      LEFT JOIN formalizations f ON p.iden = f.iden
      WHERE p.iden = ?
    `, [candidate]);
    if (row) break;
  }

  // 模糊匹配回退
  if (!row) {
    const fuzzyTerms = [...new Set(candidates.flatMap(c =>
      c.split(/[\/_.]+/).filter(s => s.length > 0)
    ))];
    if (fuzzyTerms.length > 0) {
      const whereClauses = fuzzyTerms.map(() => "p.iden LIKE ?");
      const whereParams = fuzzyTerms.map(t => `%${t.toLowerCase()}%`);
      row = queryOne(db, `
        SELECT p.*, t.translated_statement, f.formal_statement
        FROM problems p LEFT JOIN translations t ON p.iden = t.iden
        LEFT JOIN formalizations f ON p.iden = f.iden
        WHERE ${whereClauses.join(" AND ")}
        LIMIT 1
      `, whereParams);
    }
  }

  if (!row) {
    res.status(404).type("html").send("<h1>404 — 题目不存在</h1>");
    return;
  }

  const data = toCoreFormat(row);
  res.type("html").send(renderProblemPage(data));
});

/**
 * API 文档页
 */
app.get("/docs", (_req: Request, res: Response) => {
  res.type("html").send(renderApiDocsPage());
});

// ============================================================
// 错误处理
// ============================================================

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("[Server Error]", err);
  res.status(500).json({ error: "internal_error", message: err.message });
});

// ============================================================
// 启动
// ============================================================

async function main() {
  const { port, dbPath } = parseArgs();
  await getDbAsync(dbPath);
  console.log(`[Server] 数据库已就绪`);

  app.listen(port, () => {
    console.log(`\n╔══════════════════════════════════════════════╗`);
    console.log(`║    题目显示平台 — Problem Viewer             ║`);
    console.log(`╠══════════════════════════════════════════════╣`);
    console.log(`║  🌐  http://localhost:${port}                  ║`);
    console.log(`║  📋  http://localhost:${port}/problems          ║`);
    console.log(`║  📖  http://localhost:${port}/docs              ║`);
    console.log(`║  🔌  http://localhost:${port}/api/problems      ║`);
    console.log(`╚══════════════════════════════════════════════╝\n`);
  });
}

main().catch(e => {
  console.error(e);
  closeDb();
  Deno.exit(1);
});
