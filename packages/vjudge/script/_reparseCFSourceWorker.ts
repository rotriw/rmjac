/**
 * CF problem_source 重解析 worker
 * 用法: deno run -A script/_reparseCFSourceWorker.ts <source_file> <db_path> <start_line> <end_line>
 *
 * 从 problem_source*.txt 读取指定行范围的 HTML，
 * 用 convertCodeforcesDomToMarkdown 重新解析为 Markdown，
 * 更新数据库 raw_statement。
 */

import process from "node:process";
import { JSDOM } from "jsdom";
import { getDbAsync, getDb, closeDb, execute, queryAll, saveDb } from "../db/connection.ts";
import { convertCodeforcesDomToMarkdown } from "../vjudge_services/codeforces/parse.ts";

const sourceFile = process.argv[2];
const dbPath = process.argv[3];
const startLine = parseInt(process.argv[4] || "0");
const endLine = parseInt(process.argv[5] || "999999999");

if (!sourceFile || !dbPath) {
  console.error("Usage: deno run -A _reparseCFSourceWorker.ts <source_file> <db_path> <start> <end>");
  process.exit(1);
}

function extractIdenFromHtml(src: string): string | null {
  // /contest/NNN
  const mc = src.match(/<a[^>]*href="\/contest\/(\d+)"/);
  const mt = src.match(/<div class="title">([A-Za-z0-9]+)\./);
  if (mc && mt) return `CF${mc[1]}${mt[1]}`;
  // /gym/NNN
  const mg = src.match(/\/gym\/(\d+)/);
  if (mg && mt) return `CF${mg[1]}${mt[1]}`;
  return null;
}

await getDbAsync(dbPath);
const db = getDb();

// 建立已有 iden 集合
const existingSet = new Set<string>();
const allIdens = queryAll(db, "SELECT iden FROM problems WHERE platform = 'codeforces'");
for (const r of allIdens) existingSet.add(r.iden as string);

// 流式逐行读取指定范围
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";

let updated = 0;
let failed = 0;
let skipped = 0;

db.run("BEGIN TRANSACTION");

const rl = createInterface({ input: createReadStream(sourceFile, "utf-8"), crlfDelay: Infinity });
let lineNo = 0;

for await (const line of rl) {
  const idx = lineNo++;
  if (idx < startLine) continue;
  if (idx >= endLine) break;
  if (!line.trim()) continue;

  let html: string;
  try {
    const obj = JSON.parse(line);
    html = obj.source;
  } catch {
    continue;
  }

  if (!html || html.length < 100) continue;

  const iden = extractIdenFromHtml(html);
  if (!iden) { skipped++; continue; }
  if (!existingSet.has(iden)) { skipped++; continue; }

  try {
    const dom = new JSDOM(html);
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
  } catch {
    failed++;
  }
}

db.run("COMMIT");
saveDb();
closeDb();

console.log(JSON.stringify({ updated, failed, skipped }));
