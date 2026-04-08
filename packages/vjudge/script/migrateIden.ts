/**
 * 迁移脚本：将 vjudge 数据库中的 iden 从 RmjCF/RmjLG 前缀改为 CF/LG 前缀
 * 
 * 用法：deno run -A script/migrateIden.ts [--db data/vjudge.db] [--dry-run]
 */

import { getDbAsync, getDb, queryAll, saveDb, closeDb } from "../db/connection.ts";

function parseArgs() {
  const args = typeof Deno !== "undefined" ? Deno.args : process.argv.slice(2);
  let dbPath: string | undefined;
  let dryRun = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--db") dbPath = args[i + 1];
    if (args[i] === "--dry-run") dryRun = true;
  }
  return { dbPath, dryRun };
}

const { dbPath, dryRun } = parseArgs();
await getDbAsync(dbPath);
const db = getDb();

// 规则：RmjCF -> CF, RmjLG -> LG
const RULES: [RegExp, string][] = [
  [/^RmjCF/, "CF"],
  [/^RmjLG/, "LG"],
];

// 收集需要迁移的 problems
const allProblems = queryAll(db, "SELECT iden FROM problems WHERE iden LIKE 'Rmj%'");
console.log(`[Migrate] 发现 ${allProblems.length} 条需要迁移的 iden`);

let migrated = 0;
let skipped = 0;
let conflicts = 0;

for (const row of allProblems) {
  const oldIden = row.iden as string;
  let newIden = oldIden;

  for (const [pattern, replacement] of RULES) {
    if (pattern.test(oldIden)) {
      newIden = oldIden.replace(pattern, replacement);
      break;
    }
  }

  if (newIden === oldIden) {
    skipped++;
    continue;
  }

  // 检查是否已存在新 iden（防止冲突）
  const existing = queryAll(db, "SELECT iden FROM problems WHERE iden = ?", [newIden]);
  if (existing.length > 0) {
    console.warn(`[Migrate] 冲突：${oldIden} -> ${newIden} 已存在，跳过`);
    conflicts++;
    continue;
  }

  if (dryRun) {
    console.log(`[DRY RUN] ${oldIden} -> ${newIden}`);
  } else {
    // 更新 problems 表
    db.run("UPDATE problems SET iden = ? WHERE iden = ?", [newIden, oldIden]);
    // 更新 translations 表
    db.run("UPDATE translations SET iden = ? WHERE iden = ?", [newIden, oldIden]);
    // 更新 formalizations 表
    db.run("UPDATE formalizations SET iden = ? WHERE iden = ?", [newIden, oldIden]);
    // 更新 embeddings 表（如果有）
    try {
      db.run("UPDATE embeddings SET iden = ? WHERE iden = ?", [newIden, oldIden]);
    } catch { /* 表不存在时忽略 */ }
  }
  migrated++;
}

if (!dryRun && migrated > 0) {
  saveDb();
  console.log(`[Migrate] 保存数据库完成`);
}

console.log(`\n========== 迁移报告 ==========`);
console.log(`总计: ${allProblems.length}`);
console.log(`已迁移: ${migrated}`);
console.log(`跳过(无变化): ${skipped}`);
console.log(`冲突: ${conflicts}`);
console.log(`模式: ${dryRun ? "DRY RUN (未实际修改)" : "已写入"}`);

closeDb();
