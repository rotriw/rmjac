/**
 * VJudge 数据库 CLI 工具
 *
 * 用法: deno run -A script/dbTool.ts <command> [options]
 *
 * 命令: import | process | search | export | stats | query | interactive | help
 */

import { getDbAsync, getDb, closeDb, queryAll, queryOne } from "../db/connection.ts";
import { getStats } from "../db/schema.ts";
import { batchProcess, translateProblem, formalizeProblem, simplifyProblem, embedProblem } from "../db/pipeline.ts";
import { searchByText, searchEnriched, loadEmbeddings } from "../db/search.ts";
import { exportProblem } from "../db/format.ts";
import readline from "node:readline";
import path from "node:path";

// ============================================================
// 参数解析
// ============================================================

interface CliArgs {
  command: string;
  platform: string;
  operation: string;
  concurrency: number;
  model: string;
  query: string;
  topK: number;
  noSimplify: boolean;
  iden: string;
  format: string;
  dbPath?: string;
}

function parseArgs(): CliArgs {
  const args = process.argv.slice(2);
  const r: CliArgs = {
    command: args[0] || "help", platform: "all", operation: "", concurrency: 5,
    model: "qwen/qwen3-next-80b-a3b-instruct", query: "", topK: 10,
    noSimplify: false, iden: "", format: "typst",
  };

  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--platform": case "-p": r.platform = args[++i]; break;
      case "--op": case "--operation": r.operation = args[++i]; break;
      case "--concurrency": case "-c": r.concurrency = parseInt(args[++i]) || 5; break;
      case "--model": case "-m": r.model = args[++i]; break;
      case "--query": case "-q": r.query = args[++i]; break;
      case "--top": case "-k": r.topK = parseInt(args[++i]) || 10; break;
      case "--no-simplify": r.noSimplify = true; break;
      case "--iden": case "-i": r.iden = args[++i]; break;
      case "--format": case "-f": r.format = args[++i]; break;
      case "--db": r.dbPath = args[++i]; break;
      default:
        if (!args[i].startsWith("-") && !r.query) r.query = args[i];
    }
  }
  return r;
}

// ============================================================
// 命令
// ============================================================

function printHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║           VJudge 数据库 CLI 工具 (dbTool)             ║
╚═══════════════════════════════════════════════════════╝

命令:
  import       导入散落数据到 SQLite
  process      批量 AI 处理（翻译/形式化/简化/向量化）
  search       语义搜索题目
  export       导出题目为后端兼容格式
  stats        数据库统计
  query        查询题目详情
  interactive  交互式搜索
  help         帮助

选项:
  --platform, -p    平台: codeforces | atcoder | luogu | all
  --op              操作: translate | formalize | simplify | embed
  --concurrency, -c 并发数 (default: 5)
  --model, -m       AI 模型名称
  --query, -q       搜索文本
  --top, -k         返回结果数 (default: 10)
  --no-simplify     搜索时不做 AI 简化
  --iden, -i        题目标识符
  --format, -f      导出格式: typst | json
  --db              数据库路径

示例:
  deno run -A script/dbTool.ts import --platform codeforces
  deno run -A script/dbTool.ts process --op translate -p atcoder -c 10
  deno run -A script/dbTool.ts search "shortest path in weighted graph"
  deno run -A script/dbTool.ts export -i CF1234A -f json
  deno run -A script/dbTool.ts stats
  deno run -A script/dbTool.ts query -i abc443_a
  deno run -A script/dbTool.ts interactive
`);
}

async function cmdImport(args: CliArgs) {
  const scriptPath = path.resolve(import.meta.dirname || ".", "importToSqlite.ts");
  const cmdArgs = ["run", "-A", scriptPath];
  if (args.platform !== "all") cmdArgs.push("--platform", args.platform);
  if (args.dbPath) cmdArgs.push("--db", args.dbPath);

  const cmd = new Deno.Command("deno", {
    args: cmdArgs, stdin: "inherit", stdout: "inherit", stderr: "inherit",
  });
  const status = await cmd.spawn().status;
  if (!status.success) process.exit(1);
}

async function cmdProcess(args: CliArgs) {
  if (!args.operation) {
    console.error("请指定操作: --op translate|formalize|simplify|embed");
    process.exit(1);
  }

  if (args.iden) {
    const fnMap: Record<string, (iden: string, model?: string) => Promise<boolean>> = {
      translate: translateProblem, formalize: formalizeProblem,
      simplify: simplifyProblem, embed: embedProblem,
    };
    const ok = await fnMap[args.operation](args.iden, args.model);
    console.log(ok ? "✅ 成功" : "❌ 失败");
    return;
  }

  const result = await batchProcess(args.platform, args.operation as any, args.concurrency, args.model);
  console.log(`\n完成 — 成功: ${result.success}, 失败: ${result.failed}`);
}

async function cmdSearch(args: CliArgs) {
  if (!args.query) { console.error("请指定搜索文本"); process.exit(1); }

  const results = await searchEnriched(args.query, args.topK, { simplify: !args.noSimplify });

  console.log(`\n--- Top ${args.topK} 搜索结果 ---`);
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    console.log(`${(i + 1).toString().padStart(2)}. [${r.iden}] ${r.name}`);
    console.log(`    平台: ${r.platform || "?"} | 相似度: ${r.similarity.toFixed(4)}`);
    if (r.formal_statement) console.log(`    形式化: ${(r.formal_statement as string).slice(0, 80)}...`);
  }
  console.log("---");
}

function cmdExport(args: CliArgs) {
  if (!args.iden) { console.error("请指定 --iden"); process.exit(1); }
  const data = exportProblem(args.iden);
  if (!data) { console.error(`题目 ${args.iden} 不存在`); process.exit(1); }

  if (args.format === "json") {
    console.log(JSON.stringify(data, null, 2));
  } else {
    console.log(`// 题目: ${data.problem.name}`);
    console.log(`// 平台: ${data.problem.platform} | ${data.problem.limit.time}ms / ${data.problem.limit.memory}MB`);
    for (const stmt of data.statements) {
      console.log(`\n// --- ${stmt.is_translate ? "翻译" : "原文"} (${stmt.language}) ---`);
      console.log(stmt.content);
    }
  }
}

function cmdStats() {
  const db = getDb();
  const s = getStats(db);

  console.log(`
╔══════════════════════════════════════╗
║        VJudge 数据库统计             ║
╠══════════════════════════════════════╣
║  题目:      ${String(s.problems).padStart(8)}                ║
║  翻译:      ${String(s.translations).padStart(8)}                ║
║  形式化:    ${String(s.formalizations).padStart(8)}                ║
║  Embedding: ${String(s.embeddings).padStart(8)}                ║
╠══════════════════════════════════════╣`);
  for (const [p, c] of Object.entries(s.platforms)) {
    console.log(`║  ${p.padEnd(12)} ${String(c).padStart(8)}                ║`);
  }
  console.log(`╚══════════════════════════════════════╝`);

  const rows = queryAll(db,
    "SELECT operation, status, COUNT(*) as cnt FROM process_status GROUP BY operation, status ORDER BY operation");
  if (rows.length) {
    console.log("\n处理状态:");
    for (const r of rows) console.log(`  ${(r.operation as string).padEnd(12)} ${(r.status as string).padEnd(10)} ${r.cnt}`);
  }
}

function cmdQuery(args: CliArgs) {
  if (!args.iden) { console.error("请指定 --iden"); process.exit(1); }
  const db = getDb();

  const p = queryOne(db, `
    SELECT p.*, t.translated_statement, t.model as t_model,
           f.formal_statement, f.simple_statement,
           e.model as e_model, e.source_type
    FROM problems p
    LEFT JOIN translations t ON p.iden = t.iden
    LEFT JOIN formalizations f ON p.iden = f.iden
    LEFT JOIN embeddings e ON p.iden = e.iden
    WHERE p.iden = ?`, [args.iden]);

  if (!p) {
    const matches = queryAll(db,
      "SELECT iden, name, platform FROM problems WHERE iden LIKE ? OR name LIKE ? LIMIT 10",
      [`%${args.iden}%`, `%${args.iden}%`]);
    if (matches.length) {
      console.log("未精确匹配，可能的题目:");
      for (const m of matches) console.log(`  [${m.iden}] ${m.name} (${m.platform})`);
    } else console.log("未找到任何匹配");
    return;
  }

  console.log(`\n题目: ${p.name}`);
  console.log(`标识: ${p.iden} | 平台: ${p.platform}`);
  console.log(`时限: ${p.time_limit || "?"}ms | 内存: ${p.memory_limit || "?"}KB`);
  console.log(`已上传: ${p.uploaded ? "✅" : "❌"} | 创建: ${p.creation_time || "?"}`);
  if (p.translated_statement) console.log(`[翻译] ✅ (模型: ${p.t_model || "?"})`);
  if (p.formal_statement) console.log(`[形式化] ✅\n  ${(p.formal_statement as string).slice(0, 200)}...`);
  if (p.simple_statement) console.log(`[简化] ✅\n  ${(p.simple_statement as string).slice(0, 200)}`);
  if (p.e_model) console.log(`[Embedding] ✅ (${p.e_model}, ${p.source_type})`);
}

async function cmdInteractive(args: CliArgs) {
  console.log("加载向量数据...");
  loadEmbeddings();

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const ask = () => {
    rl.question("\n🔍 输入题面描述 (exit 退出): ", async (q) => {
      if (q.toLowerCase() === "exit") { rl.close(); closeDb(); return; }
      if (!q.trim()) { ask(); return; }

      try {
        const results = await searchEnriched(q, args.topK, { simplify: !args.noSimplify });
        console.log(`\n--- Top ${results.length} ---`);
        for (let i = 0; i < results.length; i++) {
          const r = results[i];
          console.log(`${(i+1).toString().padStart(2)}. [${r.iden}] ${r.name} (${r.platform}, ${r.similarity.toFixed(4)})`);
        }
      } catch (e: any) { console.error("错误:", e.message); }
      ask();
    });
  };
  ask();
}

// ============================================================
// 主逻辑
// ============================================================

async function main() {
  const args = parseArgs();

  // 除了 help 和 import 之外，都需要初始化数据库
  if (args.command !== "help" && args.command !== "import") {
    await getDbAsync(args.dbPath);
  }

  try {
    switch (args.command) {
      case "import": await cmdImport(args); break;
      case "process": await cmdProcess(args); break;
      case "search": await cmdSearch(args); break;
      case "export": cmdExport(args); break;
      case "stats": cmdStats(); break;
      case "query": cmdQuery(args); break;
      case "interactive": await cmdInteractive(args); return;
      default: printHelp(); break;
    }
  } finally {
    if (args.command !== "interactive" && args.command !== "import") closeDb();
  }
}

main().catch(e => { console.error(e); closeDb(); process.exit(1); });
