/**
 * SQLite 数据库连接管理
 * 使用 sql.js (纯 WASM) — 与 Deno 完全兼容
 */

import initSqlJs, { type Database as SqlJsDatabase } from "sql.js";
import fs from "node:fs";
import path from "node:path";
import { initializeSchema } from "./schema.ts";

const DEFAULT_DB_PATH = path.resolve(
  import.meta.dirname || ".",
  "../data/vjudge.db"
);

let _db: SqlJsDatabase | null = null;
let _dbPath: string = DEFAULT_DB_PATH;
let _SQL: any = null;

/**
 * 获取数据库连接（单例，异步初始化）
 */
export async function getDbAsync(dbPath?: string): Promise<SqlJsDatabase> {
  if (_db) return _db;

  const resolvedPath = dbPath || DEFAULT_DB_PATH;
  _dbPath = resolvedPath;
  console.log(`[DB] 打开数据库: ${resolvedPath}`);

  if (!_SQL) {
    _SQL = await initSqlJs();
  }

  if (fs.existsSync(resolvedPath)) {
    const buffer = fs.readFileSync(resolvedPath);
    _db = new _SQL.Database(buffer);
  } else {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    _db = new _SQL.Database();
  }

  // 性能优化
  _db!.run("PRAGMA journal_mode = WAL");
  _db!.run("PRAGMA synchronous = NORMAL");
  _db!.run("PRAGMA foreign_keys = ON");

  // 初始化 schema
  initializeSchema(_db!);

  // 立即保存
  saveDb();

  return _db!;
}

/**
 * 同步获取数据库（需要先调用 getDbAsync 至少一次）
 */
export function getDb(): SqlJsDatabase {
  if (!_db) {
    throw new Error("数据库未初始化。请先调用 await getDbAsync()");
  }
  return _db;
}

/**
 * 保存数据库到磁盘
 */
export function saveDb(): void {
  if (_db && _dbPath) {
    const data = _db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(_dbPath, buffer);
  }
}

/**
 * 关闭数据库连接并保存
 */
export function closeDb(): void {
  if (_db) {
    saveDb();
    _db.close();
    _db = null;
    console.log("[DB] 数据库连接已关闭");
  }
}

/**
 * 在事务中执行操作，完成后自动保存
 */
export function withTransaction<T>(db: SqlJsDatabase, fn: () => T): T {
  db.run("BEGIN TRANSACTION");
  try {
    const result = fn();
    db.run("COMMIT");
    saveDb();
    return result;
  } catch (e) {
    db.run("ROLLBACK");
    throw e;
  }
}

/**
 * 批量执行（在事务中，每 batchSize 行一次提交）
 */
export function batchRun(
  db: SqlJsDatabase,
  sql: string,
  paramsList: any[][],
  batchSize = 5000
): number {
  let inserted = 0;

  for (let i = 0; i < paramsList.length; i += batchSize) {
    const batch = paramsList.slice(i, i + batchSize);
    db.run("BEGIN TRANSACTION");
    try {
      for (const params of batch) {
        try {
          db.run(sql, params);
          inserted++;
        } catch (e: any) {
          if (!e.message?.includes("UNIQUE constraint")) {
            console.warn(`[DB] 插入失败:`, e.message);
          }
        }
      }
      db.run("COMMIT");
    } catch (e) {
      try { db.run("ROLLBACK"); } catch {}
      throw e;
    }
  }

  saveDb();
  return inserted;
}

// ============================================================
// sql.js 查询辅助
// ============================================================

/**
 * 执行查询并返回所有结果行（对象数组）
 */
export function queryAll(db: SqlJsDatabase, sql: string, params: any[] = []): any[] {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);

  const results: any[] = [];
  while (stmt.step()) {
    results.push(stmt.getAsObject());
  }
  stmt.free();
  return results;
}

/**
 * 执行查询并返回第一行，无结果返回 null
 */
export function queryOne(db: SqlJsDatabase, sql: string, params: any[] = []): any | null {
  const stmt = db.prepare(sql);
  if (params.length) stmt.bind(params);

  let result = null;
  if (stmt.step()) {
    result = stmt.getAsObject();
  }
  stmt.free();
  return result;
}

/**
 * 执行 INSERT/UPDATE/DELETE
 */
export function execute(db: SqlJsDatabase, sql: string, params: any[] = []): void {
  db.run(sql, params);
}
