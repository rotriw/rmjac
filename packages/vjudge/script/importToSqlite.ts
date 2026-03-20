/**
 * 数据导入脚本 - 将 vjudge/data 下散落数据统一导入 SQLite
 *
 * 用法: deno run -A script/importToSqlite.ts [--platform codeforces|atcoder|luogu|all]
 */

import fs from "node:fs";
import path from "node:path";
import { getDbAsync, closeDb, queryAll, queryOne, execute, batchRun, saveDb } from "../db/connection.ts";
import { getStats } from "../db/schema.ts";

// ============================================================
// 类型
// ============================================================

interface ContentType { iden: string; content: string; }

interface LocalProblemStatement {
  statement_source: string;
  problem_source: string;
  page_source: string;
  iden: string;
  problem_statements: ContentType[];
  time_limit: number;
  memory_limit: number;
  sample_group: [string, string][];
  show_order: string[];
  problem_difficulty: number | null;
  page_rendered: string | null;
  judge_option: Record<string, string>;
}

interface LocalProblem {
  problem_iden: string;
  problem_name: string;
  problem_statement: LocalProblemStatement[];
  creation_time: string;
  tags: string[];
}

// ============================================================
// CLI
// ============================================================

function parseArgs(): { platform: string; dbPath?: string } {
  const args = process.argv.slice(2);
  let platform = "all";
  let dbPath: string | undefined;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--platform" && args[i + 1]) { platform = args[++i]; }
    else if (args[i] === "--db" && args[i + 1]) { dbPath = args[++i]; }
  }
  return { platform, dbPath };
}

// ============================================================
// Codeforces
// ============================================================

function importCodeforces(db: any, dataDir: string): void {
  console.log("\n=== 导入 Codeforces 数据 ===");
  const cfDir = path.join(dataDir, "codeforces");
  if (!fs.existsSync(cfDir)) { console.log("[CF] 目录不存在，跳过"); return; }

  const problemFiles = ["problem_source.txt", "problem_b_2.txt", "problem_b_3.txt"];
  const insertSQL = `INSERT OR IGNORE INTO problems 
    (iden, name, platform, raw_statement, page_source, time_limit, memory_limit, 
     tags, difficulty, creation_time, statement_source, sample_group, show_order, judge_option)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  let totalProblems = 0;

  for (const file of problemFiles) {
    const filePath = path.join(cfDir, file);
    if (!fs.existsSync(filePath)) continue;
    console.log(`[CF] 读取 ${file}...`);

    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    const rows: any[][] = [];

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const problem: LocalProblem = JSON.parse(line);
        if (!problem.problem_iden || !problem.problem_statement?.length) continue;
        const stmt = problem.problem_statement[0];
        rows.push([
          problem.problem_iden, problem.problem_name, "codeforces",
          JSON.stringify(stmt.problem_statements || []),
          stmt.page_source || null, stmt.time_limit || null, stmt.memory_limit || null,
          JSON.stringify(problem.tags || []), stmt.problem_difficulty || null,
          problem.creation_time || null, stmt.statement_source || "Codeforces",
          JSON.stringify(stmt.sample_group || []),
          JSON.stringify(stmt.show_order || []),
          JSON.stringify(stmt.judge_option || {}),
        ]);
      } catch { /* skip */ }
    }

    if (rows.length > 0) {
      const inserted = batchRun(db, insertSQL, rows);
      totalProblems += inserted;
      console.log(`[CF] ${file}: 导入 ${inserted} 道题目`);
    }
  }

  // 翻译数据
  const translateFile = path.join(cfDir, "problem_b_2_translate.txt");
  if (fs.existsSync(translateFile)) {
    console.log("[CF] 读取翻译数据...");
    const lines = fs.readFileSync(translateFile, "utf-8").split("\n");
    const rows: any[][] = [];
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (obj.problem_iden && obj.formal_statement) {
          rows.push([obj.problem_iden, obj.formal_statement, "qwen3-next-80b"]);
        }
      } catch { /* skip */ }
    }
    if (rows.length > 0) {
      const n = batchRun(db, `INSERT OR REPLACE INTO translations (iden, translated_statement, model) VALUES (?, ?, ?)`, rows);
      console.log(`[CF] 翻译: 导入 ${n} 条`);
    }
  }

  // 形式化数据
  const formalFiles = [
    { file: "problem_b_2_formal.txt", type: "formal" as const },
    { file: "problem_b_3_formal.txt", type: "formal" as const },
    { file: "problem_b_3_2_formal.txt", type: "simple" as const },
  ];

  for (const { file, type } of formalFiles) {
    const filePath = path.join(cfDir, file);
    if (!fs.existsSync(filePath)) continue;
    console.log(`[CF] 读取 ${file}...`);
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    let count = 0;

    db.run("BEGIN TRANSACTION");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (!obj.problem_iden) continue;
        let content = obj.formal_statement;
        if (obj.choices?.[0]?.message?.content) content = obj.choices[0].message.content;
        if (!content) continue;

        if (type === "formal") {
          execute(db, `INSERT INTO formalizations (iden, formal_statement, formal_model, formal_created_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(iden) DO UPDATE SET formal_statement = ?, formal_model = ?`,
            [obj.problem_iden, content, obj.model || "qwen3-next-80b", content, obj.model || "qwen3-next-80b"]);
        } else {
          execute(db, `INSERT INTO formalizations (iden, simple_statement, simple_model, simple_created_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(iden) DO UPDATE SET simple_statement = ?, simple_model = ?`,
            [obj.problem_iden, content, obj.model || "qwen3-next-80b", content, obj.model || "qwen3-next-80b"]);
        }
        count++;
      } catch { /* skip */ }
    }
    db.run("COMMIT");
    saveDb();
    console.log(`[CF] ${file}: 处理 ${count} 条`);
  }

  // Embeddings（存为 JSON 字符串，因为 sql.js BLOB 处理不如 TEXT 方便）
  const embFiles = ["embeddings_formal.jsonl", "embeddings_2_formal.jsonl"];
  for (const file of embFiles) {
    const filePath = path.join(cfDir, file);
    if (!fs.existsSync(filePath)) continue;
    console.log(`[CF] 读取 embedding ${file}...`);
    const lines = fs.readFileSync(filePath, "utf-8").split("\n");
    let count = 0;

    db.run("BEGIN TRANSACTION");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const obj = JSON.parse(line);
        if (!obj.problemId || !obj.embedding) continue;
        execute(db,
          `INSERT OR REPLACE INTO embeddings (iden, name, embedding, model, source_type) VALUES (?, ?, ?, ?, ?)`,
          [obj.problemId, obj.name || "", JSON.stringify(obj.embedding), "bge-m3", "formal"]
        );
        count++;
      } catch { /* skip */ }
    }
    db.run("COMMIT");
    saveDb();
    console.log(`[CF] ${file}: 导入 ${count} 条 embedding`);
  }

  // 已上传标记
  const uploadedFiles = fs.readdirSync(cfDir).filter(f => f.startsWith("uploaded") && f.endsWith(".txt"));
  for (const file of uploadedFiles) {
    const lines = fs.readFileSync(path.join(cfDir, file), "utf-8").split("\n");
    db.run("BEGIN TRANSACTION");
    for (const iden of lines) {
      if (iden.trim()) execute(db, "UPDATE problems SET uploaded = 1 WHERE iden = ?", [iden.trim()]);
    }
    db.run("COMMIT");
    console.log(`[CF] ${file}: 标记已上传`);
  }
  saveDb();

  console.log(`[CF] 总计导入 ${totalProblems} 道题目`);
}

// ============================================================
// AtCoder
// ============================================================

function importAtcoder(db: any, dataDir: string): void {
  console.log("\n=== 导入 AtCoder 数据 ===");
  const atDir = path.join(dataDir, "atcoder");
  const problemsDir = path.join(atDir, "problems");
  if (!fs.existsSync(problemsDir)) { console.log("[AT] 目录不存在，跳过"); return; }

  let totalProblems = 0, totalTranslations = 0, totalFormal = 0;

  const contestDirs = fs.readdirSync(problemsDir);
  db.run("BEGIN TRANSACTION");

  for (const contestDir of contestDirs) {
    const contestPath = path.join(problemsDir, contestDir);
    if (!fs.statSync(contestPath).isDirectory()) continue;

    const files = fs.readdirSync(contestPath);
    for (const file of files) {
      if (!file.endsWith(".json") || file.includes("_translate") || file.includes("_formal") || file.includes("_simple")) continue;

      try {
        const raw = fs.readFileSync(path.join(contestPath, file), "utf-8");
        const problem: LocalProblem = JSON.parse(raw);
        if (!problem.problem_iden || !problem.problem_statement?.length) continue;
        const stmt = problem.problem_statement[0];

        execute(db, `INSERT OR IGNORE INTO problems 
          (iden, name, platform, raw_statement, page_source, time_limit, memory_limit,
           tags, difficulty, creation_time, statement_source, sample_group, show_order, judge_option)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [problem.problem_iden, problem.problem_name, "atcoder",
           JSON.stringify(stmt.problem_statements || []), stmt.page_source || null,
           stmt.time_limit || null, stmt.memory_limit || null,
           JSON.stringify(problem.tags || []), stmt.problem_difficulty || null,
           problem.creation_time || null, stmt.statement_source || "AtCoder",
           JSON.stringify(stmt.sample_group || []),
           JSON.stringify(stmt.show_order || []),
           JSON.stringify(stmt.judge_option || {})]);
        totalProblems++;

        // 伴生文件
        const baseName = path.basename(file, ".json");
        const tFile = path.join(contestPath, `${baseName}_translate.json`);
        if (fs.existsSync(tFile)) {
          execute(db, `INSERT OR REPLACE INTO translations (iden, translated_statement, model) VALUES (?, ?, ?)`,
            [problem.problem_iden, fs.readFileSync(tFile, "utf-8"), "qwen3-next-80b"]);
          totalTranslations++;
        }

        const fFile = path.join(contestPath, `${baseName}_formal.json`);
        if (fs.existsSync(fFile)) {
          execute(db, `INSERT INTO formalizations (iden, formal_statement, formal_model, formal_created_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(iden) DO UPDATE SET formal_statement = ?, formal_model = ?`,
            [problem.problem_iden, fs.readFileSync(fFile, "utf-8"), "qwen3-next-80b",
             fs.readFileSync(fFile, "utf-8"), "qwen3-next-80b"]);
          totalFormal++;
        }

        const sFile = path.join(contestPath, `${baseName}_simple.json`);
        if (fs.existsSync(sFile)) {
          execute(db, `INSERT INTO formalizations (iden, simple_statement, simple_model, simple_created_at)
            VALUES (?, ?, ?, datetime('now'))
            ON CONFLICT(iden) DO UPDATE SET simple_statement = ?, simple_model = ?`,
            [problem.problem_iden, fs.readFileSync(sFile, "utf-8"), "qwen3-next-80b",
             fs.readFileSync(sFile, "utf-8"), "qwen3-next-80b"]);
        }
      } catch { /* skip */ }
    }
  }

  db.run("COMMIT");

  // 已上传标记
  const uploadedFile = path.join(atDir, "uploaded.txt");
  if (fs.existsSync(uploadedFile)) {
    const lines = fs.readFileSync(uploadedFile, "utf-8").split("\n");
    db.run("BEGIN TRANSACTION");
    for (const iden of lines) {
      if (iden.trim()) execute(db, "UPDATE problems SET uploaded = 1 WHERE iden = ?", [iden.trim()]);
    }
    db.run("COMMIT");
  }

  saveDb();
  console.log(`[AT] 导入 ${totalProblems} 道题目, ${totalTranslations} 翻译, ${totalFormal} 形式化`);
}

// ============================================================
// Luogu
// ============================================================

function importLuogu(db: any, dataDir: string): void {
  console.log("\n=== 导入 Luogu 数据 ===");
  const luoguDir = path.join(dataDir, "luogu");
  const ndjsonFile = path.join(luoguDir, "latest.ndjson");
  if (!fs.existsSync(ndjsonFile)) { console.log("[LG] latest.ndjson 不存在，跳过"); return; }

  console.log("[LG] 读取 latest.ndjson...");
  const lines = fs.readFileSync(ndjsonFile, "utf-8").split("\n");
  const rows: any[][] = [];

  // Luogu ndjson 格式:
  // { pid, type, difficulty, samples, limits: { time: number[], memory: number[] },
  //   tags, title, background, description, inputFormat, outputFormat, hint,
  //   locale, translations }
  for (const line of lines) {
    if (!line.trim()) continue;
    try {
      const p = JSON.parse(line);
      if (!p.pid || !p.title) continue;

      // 构建 iden: 加 LG 前缀
      const iden = `LG${p.pid}`;

      // 从各部分拼装 raw_statement (ContentType[] 格式)
      const stmts: ContentType[] = [];
      if (p.background) stmts.push({ iden: "background", content: p.background });
      if (p.description) stmts.push({ iden: "statement", content: p.description });
      if (p.inputFormat) stmts.push({ iden: "input", content: p.inputFormat });
      if (p.outputFormat) stmts.push({ iden: "output", content: p.outputFormat });
      if (p.hint) stmts.push({ iden: "note", content: p.hint });

      // 取 limits 中的第一个值 (Luogu 有多测试点限制)
      const timeLimit = Array.isArray(p.limits?.time) ? p.limits.time[0] : (p.limits?.time || null);
      const memoryLimit = Array.isArray(p.limits?.memory) ? p.limits.memory[0] : (p.limits?.memory || null);

      rows.push([
        iden, p.title, "luogu",
        JSON.stringify(stmts),
        null, // page_source
        timeLimit, memoryLimit,
        JSON.stringify(p.tags || []),
        p.difficulty || null,
        null, // creation_time
        "Luogu",
        JSON.stringify(p.samples || []),
        JSON.stringify([]), // show_order
        JSON.stringify({}), // judge_option
      ]);
    } catch { /* skip malformed lines */ }
  }

  const count = batchRun(db, `INSERT OR IGNORE INTO problems 
    (iden, name, platform, raw_statement, page_source, time_limit, memory_limit,
     tags, difficulty, creation_time, statement_source, sample_group, show_order, judge_option)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`, rows);

  // 已上传
  const uploadedFile = path.join(luoguDir, "uploaded.txt");
  if (fs.existsSync(uploadedFile)) {
    const idens = fs.readFileSync(uploadedFile, "utf-8").split("\n");
    db.run("BEGIN TRANSACTION");
    for (const iden of idens) {
      if (iden.trim()) execute(db, "UPDATE problems SET uploaded = 1 WHERE iden = ?", [iden.trim()]);
    }
    db.run("COMMIT");
    saveDb();
  }

  console.log(`[LG] 导入 ${count} 道题目`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  const { platform, dbPath } = parseArgs();
  const db = await getDbAsync(dbPath);
  const dataDir = path.resolve(import.meta.dirname || ".", "../data");

  console.log(`数据目录: ${dataDir}`);
  console.log(`导入平台: ${platform}`);
  const t0 = Date.now();

  try {
    if (platform === "all" || platform === "codeforces") importCodeforces(db, dataDir);
    if (platform === "all" || platform === "atcoder") importAtcoder(db, dataDir);
    if (platform === "all" || platform === "luogu") importLuogu(db, dataDir);

    const elapsed = ((Date.now() - t0) / 1000).toFixed(1);
    console.log(`\n=== 导入完成 (${elapsed}s) ===`);
    const stats = getStats(db);
    console.log(`题目总数: ${stats.problems}`);
    console.log(`翻译: ${stats.translations}`);
    console.log(`形式化: ${stats.formalizations}`);
    console.log(`Embedding: ${stats.embeddings}`);
    console.log(`按平台:`, stats.platforms);
  } finally {
    closeDb();
  }
}

main().catch(console.error);
