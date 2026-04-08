/**
 * CF 单文件重解析 worker
 * 用法: deno run -A script/_reparseCFWorker.ts <jsonl_path> <db_path>
 *
 * 从 JSONL 读取问题，重新解析 page_source HTML → Markdown，更新数据库
 */

import fs from "node:fs";
import { JSDOM } from "jsdom";
import { getDbAsync, getDb, closeDb, execute, queryAll, saveDb } from "../db/connection.ts";
import { convertCodeforcesDomToMarkdown } from "../vjudge_services/codeforces/parse.ts";

const jsonlPath = process.argv[2];
const dbPath = process.argv[3];

if (!jsonlPath || !dbPath) {
  console.error("Usage: deno run -A script/_reparseCFWorker.ts <jsonl_path> <db_path>");
  process.exit(1);
}

await getDbAsync(dbPath);
const db = getDb();

// 建立已有 iden 集合
const existingSet = new Set<string>();
const allIdens = queryAll(db, "SELECT iden FROM problems WHERE platform = 'codeforces'");
for (const r of allIdens) existingSet.add(r.iden as string);

const content = fs.readFileSync(jsonlPath, "utf-8");
const lines = content.split("\n");
let updated = 0;
let failed = 0;

db.run("BEGIN TRANSACTION");

for (let i = 0; i < lines.length; i++) {
  if (!lines[i].trim()) continue;
  let problem: any;
  try { problem = JSON.parse(lines[i]); } catch { continue; }

  const ps = problem.problem_statement?.[0];
  if (!ps?.page_source || ps.page_source.length < 50) continue;

  const iden = problem.problem_iden;
  if (!existingSet.has(iden)) continue;

  try {
    const dom = new JSDOM(ps.page_source);
    const newStatements = await convertCodeforcesDomToMarkdown(dom);
    dom.window.close();

    if (newStatements.length === 0) { failed++; continue; }

    execute(db,
      "UPDATE problems SET raw_statement = ? WHERE iden = ?",
      [JSON.stringify(newStatements), iden]);
    updated++;

    if (updated % 50 === 0) {
      db.run("COMMIT");
      saveDb();
      db.run("BEGIN TRANSACTION");
    }
  } catch { failed++; }

  problem = null;
  lines[i] = ""; // 释放内存
}

db.run("COMMIT");
saveDb();
closeDb();

// 输出结果（供父进程解析）
console.log(JSON.stringify({ updated, failed }));
