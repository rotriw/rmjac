/**
 * 重解析脚本 - 将 CF/AT 的 HTML 重新解析为 Markdown 格式
 *
 * CF: 从 problem_source*.txt 读原始 HTML → convertCodeforcesDomToMarkdown → 更新 DB
 *     对于 handled5/parsed/*.jsonl 中有 page_source 的条目同理处理
 * AT: 从数据库 page_source 读 HTML → convertAtcoderEnglishDomToMarkdown → 更新 DB
 *
 * 用法: deno run -A script/reparseToMarkdown.ts [--platform codeforces|atcoder|all] [--db <path>]
 */

import fs from "node:fs";
import { createReadStream } from "node:fs";
import { createInterface } from "node:readline";
import path from "node:path";
import process from "node:process";
import { JSDOM } from "jsdom";
import { getDbAsync, getDb, closeDb, execute, queryAll, saveDb } from "../db/connection.ts";
import { convertAtcoderEnglishDomToMarkdown } from "../vjudge_services/atcoder/parse.ts";

async function countLines(filePath: string): Promise<number> {
  const rl = createInterface({ input: createReadStream(filePath), crlfDelay: Infinity });
  let count = 0;
  for await (const _ of rl) count++;
  return count;
}

// ============================================================
// CF 重解析
// ============================================================

async function reparseCF(dataDir: string) {
  console.log("\n=== 重解析 Codeforces (HTML → Markdown) ===");

  const dbPath = path.resolve(dataDir, "vjudge.db");
  const sourceWorker = path.resolve(import.meta.dirname || ".", "_reparseCFSourceWorker.ts");
  const jsonlWorker = path.resolve(import.meta.dirname || ".", "_reparseCFWorker.ts");

  // ---------- Phase 1: problem_source*.txt ----------
  const sourceFiles = [
    "problem_source.txt",
    "problem_source_2.txt",
    "problem_source_3.txt",
  ]
    .map(f => path.join(dataDir, "codeforces", f))
    .filter(f => fs.existsSync(f));

  console.log(`[CF] Phase 1: problem_source*.txt (${sourceFiles.length} 文件)`);

  // 关闭主进程 DB，让子进程独占
  closeDb();

  let totalUpdated = 0;
  let totalFailed = 0;
  const BATCH = 200; // 每批处理 200 行

  for (const srcFile of sourceFiles) {
    const lineCount = await countLines(srcFile);
    const baseName = path.basename(srcFile);
    console.log(`[CF] ${baseName}: ${lineCount} 行`);

    for (let start = 0; start < lineCount; start += BATCH) {
      const end = Math.min(start + BATCH, lineCount);
      const cmd = new Deno.Command("deno", {
        args: ["run", "-A", sourceWorker, srcFile, dbPath, String(start), String(end)],
        stdout: "piped",
        stderr: "piped",
      });
      const output = await cmd.output();
      const stdout = new TextDecoder().decode(output.stdout).trim();

      if (output.code !== 0) {
        const stderr = new TextDecoder().decode(output.stderr);
        console.error(`  ✗ ${baseName}[${start}-${end}]: ${stderr.slice(0, 120)}`);
        totalFailed++;
        continue;
      }

      const lastLine = stdout.split("\n").pop() || "";
      try {
        const result = JSON.parse(lastLine);
        totalUpdated += result.updated;
        totalFailed += result.failed;
      } catch { /* ignore */ }

      process.stdout.write(
        `\r  ${baseName}: ${end}/${lineCount}  ✓${totalUpdated} ✗${totalFailed}`
      );
    }
    console.log(); // newline
  }

  // ---------- Phase 2: handled5/parsed/*.jsonl ----------
  const h5Dir = path.join(dataDir, "codeforces", "handled5", "parsed");
  if (fs.existsSync(h5Dir)) {
    const jsonlFiles = fs.readdirSync(h5Dir)
      .filter(f => f.endsWith(".jsonl"))
      .sort()
      .map(f => path.join(h5Dir, f));

    console.log(`[CF] Phase 2: handled5/parsed (${jsonlFiles.length} JSONL 文件)`);

    for (let i = 0; i < jsonlFiles.length; i++) {
      const filePath = jsonlFiles[i];
      const cmd = new Deno.Command("deno", {
        args: ["run", "-A", jsonlWorker, filePath, dbPath],
        stdout: "piped",
        stderr: "piped",
      });
      const output = await cmd.output();
      const stdout = new TextDecoder().decode(output.stdout).trim();

      if (output.code !== 0) { totalFailed++; continue; }

      const lastLine = stdout.split("\n").pop() || "";
      try {
        const result = JSON.parse(lastLine);
        totalUpdated += result.updated;
        totalFailed += result.failed;
      } catch { /* ignore */ }

      process.stdout.write(
        `\r  handled5: [${i + 1}/${jsonlFiles.length}] ✓${totalUpdated} ✗${totalFailed}`
      );
    }
    console.log();
  }

  // 重新打开 DB
  await getDbAsync(dbPath);
  const db = getDb();

  console.log(`[CF] 总计: ✓${totalUpdated} ✗${totalFailed}`);

  // 统计覆盖
  const cfTotal = queryAll(db, "SELECT COUNT(*) as cnt FROM problems WHERE platform = 'codeforces'");
  const typstPatterns = ["#cf_span[", "#emph[", "#strong[", "lt.eq", "dots.h"];
  for (const pat of typstPatterns) {
    const r = queryAll(db,
      "SELECT COUNT(*) as cnt FROM problems WHERE platform = 'codeforces' AND raw_statement LIKE ?",
      [`%${pat}%`]);
    const cnt = (r[0]?.cnt as number) || 0;
    if (cnt > 0) console.log(`  [残留] "${pat}": ${cnt} 道`);
  }
  console.log(`[CF] 共 ${(cfTotal[0]?.cnt as number) || 0} 道题`);
}

// ============================================================
// AT 重解析
// ============================================================

async function reparseAT() {
  console.log("\n=== 重解析 AtCoder (HTML → Markdown) ===");
  const db = getDb();

  const problems = queryAll(db,
    "SELECT iden, page_source FROM problems WHERE platform = 'atcoder' AND page_source IS NOT NULL AND length(page_source) > 10");

  console.log(`[AT] 待重解析: ${problems.length} 道题目`);

  let updated = 0;
  let failed = 0;
  const batchSize = 500;

  for (let i = 0; i < problems.length; i += batchSize) {
    const batch = problems.slice(i, i + batchSize);
    db.run("BEGIN TRANSACTION");

    for (const p of batch) {
      try {
        const html = p.page_source as string;
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        const langEn = doc.querySelector("span.lang-en") || doc.body;
        const newStatements = await convertAtcoderEnglishDomToMarkdown(langEn);

        if (newStatements.length === 0) { failed++; continue; }

        execute(db,
          "UPDATE problems SET raw_statement = ? WHERE iden = ?",
          [JSON.stringify(newStatements), p.iden]);
        updated++;
      } catch { failed++; }
    }

    db.run("COMMIT");
    saveDb();
    process.stdout.write(`\r[AT] 进度: ${Math.min(i + batchSize, problems.length)}/${problems.length} ✓${updated} ✗${failed}`);
  }
  console.log(`\n[AT] 完成: ✓${updated} ✗${failed}`);
}

// ============================================================
// Main
// ============================================================

async function main() {
  const platform = process.argv.find((_, i, a) => a[i - 1] === "--platform" || a[i - 1] === "-p") || "all";
  const dbPath = process.argv.find((_, i, a) => a[i - 1] === "--db");

  await getDbAsync(dbPath);
  const dataDir = path.resolve(import.meta.dirname || ".", "../data");

  const start = Date.now();

  if (platform === "all" || platform === "codeforces") {
    await reparseCF(dataDir);
  }
  if (platform === "all" || platform === "atcoder") {
    await reparseAT();
  }

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n=== 重解析完成 (${elapsed}s) ===`);

  // 抽样验证
  const db = getDb();
  const sample = queryAll(db,
    "SELECT iden, substr(raw_statement, 1, 300) as preview FROM problems WHERE platform IN ('codeforces','atcoder') ORDER BY RANDOM() LIMIT 5");
  console.log("\n随机抽样验证:");
  const typstKeywords = ["#emph", "#cf_span", "lt.eq", "dots.h", "#figure(", "#strong["];
  for (const s of sample) {
    const preview = s.preview as string;
    const hasTypst = typstKeywords.some(k => preview.includes(k));
    console.log(`  [${s.iden}] ${hasTypst ? "⚠️ 仍含Typst" : "✅ Markdown"}: ${preview.slice(0, 100)}...`);
  }

  closeDb();
}

main().catch(e => { console.error(e); closeDb(); process.exit(1); });
