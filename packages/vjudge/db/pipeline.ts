/**
 * 统一 AI 处理管线
 * 翻译、形式化、简化、向量化 — 所有 I/O 通过 SQLite
 */

import OpenAI from "openai";
import { getDb, getDbAsync, execute, queryOne, queryAll, saveDb } from "./connection.ts";

// ============================================================
// AI 客户端
// ============================================================

function getAIConfig() {
  const apiKey = process.env.ONEAPI_KEY;
  const baseURL = process.env.ONEAPI_BASEURL || "https://oneapi.wanghu.rcfortress.site:8443/v1";
  if (!apiKey) throw new Error("未设置 ONEAPI_KEY 环境变量");
  return { apiKey, baseURL };
}

function createClient(timeout = 30000): OpenAI {
  const c = getAIConfig();
  return new OpenAI({ apiKey: c.apiKey, baseURL: c.baseURL, timeout });
}

// ============================================================
// Prompt 模板
// ============================================================

const TRANSLATE_PROMPT = `你是一位专业的编程竞赛题面本地化工程师，擅长将英文算法题精准翻译为中文，同时严格保持技术细节的完整性。请将输入的 JSON 数组中的每个对象的 content 字段翻译为中文，要求如下： 
仅翻译自然语言部分，所有数学公式（位于 $...$ 内的 LaTeX）必须原样保留，不得改动、转义或美化；
保留所有 Markdown 格式（标题 ##、加粗 **、斜体 *、列表 -、图片 ![]() 等）；
术语规范：alternating sum → “交错和”，test case → “测试用例”，sequence → “序列”，output / input → “输出” / “输入”；
保持段落结构、换行符与原 content 一致；
输出必须是合法 JSON 数组，字段名 iden, content 不变；
禁止添加任何解释、注释。
请直接输出翻译后的 JSON 数组。`;

const FORMALIZE_PROMPT = `You are a mathematical formalization engine for competitive programming problems.

**Task:** Convert the problem into a precise, minimal mathematical formulation. Output ONLY the mathematical statement — no solution, no algorithm, no explanation.

**Output format (Markdown with LaTeX):**

### Definitions
- Define all variables, sets, sequences using LaTeX ($...$).

### Given
- State all inputs and constraints as mathematical inequalities/conditions.

### Objective
- State exactly what to compute/find/maximize/minimize.

**Rules:**
1. Use standard LaTeX: $n$, $a_1, a_2, \\ldots, a_n$, $\\sum$, $\\binom{n}{k}$, $\\gcd$, $\\lfloor x \\rfloor$, $\\mathbb{Z}$, etc.
2. Use $$...$$ for important standalone formulas.
3. Keep it SHORT — at most 15 lines. No narrative, no "Charlie", no story context.
4. DO NOT describe any algorithm or solution approach.
5. DO NOT use code blocks. Use only math notation.
6. Output immediately without thinking tags or preamble.`;

const SIMPLIFY_PROMPT = `You only need to simplied the problem.
MAKE STATEMENT EASILY AS YOU CAN.
DONT THINK HOW TO SOLVE PROBLEM, PRINT FAST AND ONLY PRINT ENGLISH VERSION NEW STATEMENT.
MAKE NEW STATEMENT EASILY AS YOU CAN.
DONT THINK TOO MANY, PRINT FAST AND ONLY PRINT ENGLISH VERSION ANSWER.`;

// ============================================================
// 核心处理函数
// ============================================================

interface ContentType { iden: string; content: string; }

function setStatus(db: any, iden: string, op: string, status: string, err?: string) {
  const now = new Date().toISOString();
  execute(db,
    `INSERT INTO process_status (iden, operation, status, error_message, started_at, completed_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(iden, operation) DO UPDATE SET status=?, error_message=?,
       completed_at = CASE WHEN ? IN ('done','failed') THEN ? ELSE completed_at END,
       started_at = CASE WHEN ? = 'processing' THEN ? ELSE started_at END`,
    [iden, op, status, err || null,
     status === "processing" ? now : null,
     (status === "done" || status === "failed") ? now : null,
     status, err || null, status, now, status, now]);
}

/** 翻译单道题目 */
export async function translateProblem(iden: string, model = "qwen/qwen3-next-80b-a3b-instruct"): Promise<boolean> {
  const db = getDb();
  const client = createClient();

  const problem = queryOne(db, "SELECT raw_statement, name FROM problems WHERE iden = ?", [iden]);
  if (!problem?.raw_statement) { console.warn(`[翻译] ${iden} 无题面`); return false; }

  setStatus(db, iden, "translate", "processing");
  try {
    const statements: ContentType[] = JSON.parse(problem.raw_statement as string);
    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: TRANSLATE_PROMPT },
        { role: "user", content: JSON.stringify(statements) },
      ],
    });
    const translated = response.choices[0].message?.content || "";
    execute(db, `INSERT OR REPLACE INTO translations (iden, translated_statement, model) VALUES (?, ?, ?)`,
      [iden, translated, model]);
    setStatus(db, iden, "translate", "done");
    saveDb();
    return true;
  } catch (e: any) {
    setStatus(db, iden, "translate", "failed", e.message);
    saveDb();
    return false;
  }
}

/** 流式翻译单道题目，通过 onChunk 回调推送每个增量 token */
export async function translateProblemStream(
  iden: string,
  model = "qwen/qwen3-next-80b-a3b-instruct",
  onChunk?: (delta: string, accumulated: string) => void,
): Promise<boolean> {
  const db = getDb();
  const client = createClient(120000);

  const problem = queryOne(db, "SELECT raw_statement, name FROM problems WHERE iden = ?", [iden]);
  if (!problem?.raw_statement) { console.warn(`[翻译] ${iden} 无题面`); return false; }

  setStatus(db, iden, "translate", "processing");
  try {
    const statements: ContentType[] = JSON.parse(problem.raw_statement as string);
    const stream = await client.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: TRANSLATE_PROMPT },
        { role: "user", content: JSON.stringify(statements) },
      ],
    });

    let accumulated = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        accumulated += delta;
        onChunk?.(delta, accumulated);
      }
    }

    if (!accumulated) {
      setStatus(db, iden, "translate", "failed", "AI 无输出");
      saveDb();
      return false;
    }

    execute(db, `INSERT OR REPLACE INTO translations (iden, translated_statement, model) VALUES (?, ?, ?)`,
      [iden, accumulated, model]);
    setStatus(db, iden, "translate", "done");
    saveDb();
    return true;
  } catch (e: any) {
    setStatus(db, iden, "translate", "failed", e.message);
    saveDb();
    return false;
  }
}

/** 形式化题面 */
export async function formalizeProblem(iden: string, model = "qwen/qwen3-next-80b-a3b-instruct"): Promise<boolean> {
  const db = getDb();
  const client = createClient(20000);

  const problem = queryOne(db, "SELECT raw_statement FROM problems WHERE iden = ?", [iden]);
  if (!problem?.raw_statement) return false;

  setStatus(db, iden, "formalize", "processing");
  try {
    const statements: ContentType[] = JSON.parse(problem.raw_statement as string);
    const content = statements.find(s => s.iden === "statement" || s.iden === "problem statement")?.content || "";
    if (!content) { setStatus(db, iden, "formalize", "failed", "无 statement"); saveDb(); return false; }

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: FORMALIZE_PROMPT },
        { role: "user", content },
      ],
    });
    const formal = response.choices[0].message?.content || "";
    execute(db, `INSERT INTO formalizations (iden, formal_statement, formal_model, formal_created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(iden) DO UPDATE SET formal_statement=?, formal_model=?, formal_created_at=datetime('now')`,
      [iden, formal, model, formal, model]);
    setStatus(db, iden, "formalize", "done");
    saveDb();
    return true;
  } catch (e: any) {
    setStatus(db, iden, "formalize", "failed", e.message);
    saveDb();
    return false;
  }
}

/** 流式形式化题面，通过 onChunk 回调推送每个增量 token */
export async function formalizeProblemStream(
  iden: string,
  model = "qwen/qwen3-next-80b-a3b-instruct",
  onChunk?: (delta: string, accumulated: string) => void,
): Promise<boolean> {
  const db = getDb();
  const client = createClient(120000);

  const problem = queryOne(db, "SELECT raw_statement FROM problems WHERE iden = ?", [iden]);
  if (!problem?.raw_statement) { console.warn(`[形式化] ${iden} 无题面`); return false; }

  setStatus(db, iden, "formalize", "processing");
  try {
    const statements: ContentType[] = JSON.parse(problem.raw_statement as string);
    const content = statements.find(s => s.iden === "statement" || s.iden === "problem statement")?.content || "";
    if (!content) { setStatus(db, iden, "formalize", "failed", "无 statement"); saveDb(); return false; }

    const stream = await client.chat.completions.create({
      model,
      stream: true,
      messages: [
        { role: "system", content: FORMALIZE_PROMPT },
        { role: "user", content },
      ],
    });

    let accumulated = "";
    for await (const chunk of stream) {
      const delta = chunk.choices[0]?.delta?.content || "";
      if (delta) {
        accumulated += delta;
        onChunk?.(delta, accumulated);
      }
    }

    if (!accumulated) {
      setStatus(db, iden, "formalize", "failed", "AI 无输出");
      saveDb();
      return false;
    }

    execute(db, `INSERT INTO formalizations (iden, formal_statement, formal_model, formal_created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(iden) DO UPDATE SET formal_statement=?, formal_model=?, formal_created_at=datetime('now')`,
      [iden, accumulated, model, accumulated, model]);
    setStatus(db, iden, "formalize", "done");
    saveDb();
    return true;
  } catch (e: any) {
    setStatus(db, iden, "formalize", "failed", e.message);
    saveDb();
    return false;
  }
}

/** 简化题面 */
export async function simplifyProblem(iden: string, model = "qwen/qwen3-next-80b-a3b-instruct"): Promise<boolean> {
  const db = getDb();
  const client = createClient(20000);

  const problem = queryOne(db, "SELECT raw_statement FROM problems WHERE iden = ?", [iden]);
  if (!problem?.raw_statement) return false;

  setStatus(db, iden, "simplify", "processing");
  try {
    const statements: ContentType[] = JSON.parse(problem.raw_statement as string);
    const content = statements.find(s => s.iden === "statement" || s.iden === "problem statement")?.content || "";
    if (!content) { setStatus(db, iden, "simplify", "failed", "无 statement"); saveDb(); return false; }

    const response = await client.chat.completions.create({
      model,
      messages: [
        { role: "system", content: SIMPLIFY_PROMPT },
        { role: "user", content },
      ],
    });
    const simple = response.choices[0].message?.content || "";
    execute(db, `INSERT INTO formalizations (iden, simple_statement, simple_model, simple_created_at)
      VALUES (?, ?, ?, datetime('now'))
      ON CONFLICT(iden) DO UPDATE SET simple_statement=?, simple_model=?, simple_created_at=datetime('now')`,
      [iden, simple, model, simple, model]);
    setStatus(db, iden, "simplify", "done");
    saveDb();
    return true;
  } catch (e: any) {
    setStatus(db, iden, "simplify", "failed", e.message);
    saveDb();
    return false;
  }
}

/** 生成 embedding */
export async function embedProblem(iden: string, embeddingModel = "bge-m3"): Promise<boolean> {
  const db = getDb();
  const c = getAIConfig();
  const client = new OpenAI({ apiKey: c.apiKey, baseURL: c.baseURL });

  const problem = queryOne(db, "SELECT name, raw_statement FROM problems WHERE iden = ?", [iden]);
  if (!problem) return false;

  const formal = queryOne(db, "SELECT formal_statement, simple_statement FROM formalizations WHERE iden = ?", [iden]);

  let inputText: string;
  let sourceType: string;

  if (formal?.simple_statement) {
    inputText = `Problem: ${problem.name}\n${formal.simple_statement}`;
    sourceType = "simple";
  } else if (formal?.formal_statement) {
    inputText = `Problem: ${problem.name}\n${formal.formal_statement}`;
    sourceType = "formal";
  } else {
    const stmts: ContentType[] = JSON.parse((problem.raw_statement as string) || "[]");
    const content = stmts.find(s => s.iden === "statement" || s.iden === "problem statement")?.content || "";
    if (!content) return false;
    inputText = `Problem: ${problem.name}\n${content}`;
    sourceType = "raw";
  }

  setStatus(db, iden, "embed", "processing");
  try {
    const response = await client.embeddings.create({
      model: embeddingModel, input: inputText, encoding_format: "float",
    });
    const embedding = response.data[0].embedding;

    execute(db,
      `INSERT OR REPLACE INTO embeddings (iden, name, embedding, model, source_type) VALUES (?, ?, ?, ?, ?)`,
      [iden, problem.name, JSON.stringify(embedding), embeddingModel, sourceType]);
    setStatus(db, iden, "embed", "done");
    saveDb();
    return true;
  } catch (e: any) {
    setStatus(db, iden, "embed", "failed", e.message);
    saveDb();
    return false;
  }
}

// ============================================================
// 批量处理
// ============================================================

type Operation = "translate" | "formalize" | "simplify" | "embed";

const OP_FN: Record<Operation, (iden: string, model?: string) => Promise<boolean>> = {
  translate: translateProblem,
  formalize: formalizeProblem,
  simplify: simplifyProblem,
  embed: embedProblem,
};

export async function batchProcess(
  platform: string,
  operation: Operation,
  concurrency = 5,
  model?: string,
): Promise<{ success: number; failed: number }> {
  const db = getDb();
  const fn = OP_FN[operation];

  let sql: string;
  const params: any[] = [];

  switch (operation) {
    case "translate":
      sql = `SELECT p.iden FROM problems p LEFT JOIN translations t ON p.iden = t.iden WHERE t.iden IS NULL`;
      break;
    case "formalize":
      sql = `SELECT p.iden FROM problems p LEFT JOIN formalizations f ON p.iden = f.iden WHERE f.formal_statement IS NULL`;
      break;
    case "simplify":
      sql = `SELECT p.iden FROM problems p LEFT JOIN formalizations f ON p.iden = f.iden WHERE f.simple_statement IS NULL`;
      break;
    case "embed":
      sql = `SELECT p.iden FROM problems p LEFT JOIN embeddings e ON p.iden = e.iden WHERE e.iden IS NULL`;
      break;
  }

  if (platform !== "all") {
    sql += " AND p.platform = ?";
    params.push(platform);
  }

  const todos = queryAll(db, sql, params) as { iden: string }[];
  console.log(`[批量] ${operation} | 平台: ${platform} | 待处理: ${todos.length} | 并发: ${concurrency}`);

  if (todos.length === 0) return { success: 0, failed: 0 };

  let success = 0, failed = 0, idx = 0;

  async function worker() {
    while (idx < todos.length) {
      const current = idx++;
      const ok = await fn(todos[current].iden, model);
      ok ? success++ : failed++;
      if ((success + failed) % 50 === 0) {
        console.log(`[批量] 进度: ${success + failed}/${todos.length} (✓${success} ✗${failed})`);
      }
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return { success, failed };
}
