/**
 * VJudge SQLite 数据库模块 — 统一导出
 *
 * 用法 (编程接口):
 *   import { getDbAsync, searchByText, exportProblem, batchProcess } from "./db/index.ts";
 */

// 数据库连接
export {
  getDbAsync,
  getDb,
  closeDb,
  saveDb,
  withTransaction,
  batchRun,
  queryAll,
  queryOne,
  execute,
} from "./connection.ts";

// Schema
export { CREATE_TABLES_SQL, initializeSchema, getStats } from "./schema.ts";

// AI 处理管线
export {
  translateProblem,
  formalizeProblem,
  simplifyProblem,
  embedProblem,
  batchProcess,
} from "./pipeline.ts";

// 语义搜索
export {
  loadEmbeddings,
  searchByVector,
  searchByText,
  searchEnriched,
} from "./search.ts";

// 格式转换
export {
  convertToBackendStatements,
  convertToBackendProblem,
  exportProblem,
} from "./format.ts";
