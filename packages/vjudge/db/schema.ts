/**
 * SQLite Schema 定义
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES_SQL = `
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS problems (
  iden TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  raw_statement TEXT,
  page_source TEXT,
  time_limit INTEGER,
  memory_limit INTEGER,
  tags TEXT DEFAULT '[]',
  difficulty REAL,
  creation_time TEXT,
  uploaded INTEGER DEFAULT 0,
  statement_source TEXT,
  sample_group TEXT DEFAULT '[]',
  show_order TEXT DEFAULT '[]',
  judge_option TEXT DEFAULT '{}',
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS translations (
  iden TEXT PRIMARY KEY,
  translated_statement TEXT,
  model TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (iden) REFERENCES problems(iden)
);

CREATE TABLE IF NOT EXISTS formalizations (
  iden TEXT PRIMARY KEY,
  formal_statement TEXT,
  simple_statement TEXT,
  formal_model TEXT,
  simple_model TEXT,
  formal_created_at TEXT,
  simple_created_at TEXT,
  FOREIGN KEY (iden) REFERENCES problems(iden)
);

CREATE TABLE IF NOT EXISTS embeddings (
  iden TEXT PRIMARY KEY,
  name TEXT,
  embedding TEXT,
  model TEXT,
  source_type TEXT DEFAULT 'formal',
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (iden) REFERENCES problems(iden)
);

CREATE TABLE IF NOT EXISTS process_status (
  iden TEXT NOT NULL,
  operation TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  PRIMARY KEY (iden, operation),
  FOREIGN KEY (iden) REFERENCES problems(iden)
);

CREATE INDEX IF NOT EXISTS idx_problems_platform ON problems(platform);
CREATE INDEX IF NOT EXISTS idx_problems_uploaded ON problems(uploaded);
CREATE INDEX IF NOT EXISTS idx_process_status ON process_status(operation, status);
`;

/** 初始化数据库 schema */
export function initializeSchema(db: any): void {
  db.run(CREATE_TABLES_SQL);

  const stmt = db.prepare("SELECT version FROM schema_version LIMIT 1");
  const hasVersion = stmt.step();
  stmt.free();

  if (!hasVersion) {
    db.run("INSERT INTO schema_version (version) VALUES (?)", [SCHEMA_VERSION]);
  }
}

/** 获取统计信息 */
export function getStats(db: any): {
  problems: number;
  translations: number;
  formalizations: number;
  embeddings: number;
  platforms: Record<string, number>;
} {
  const count = (table: string): number => {
    const stmt = db.prepare(`SELECT COUNT(*) as cnt FROM ${table}`);
    stmt.step();
    const val = stmt.getAsObject().cnt as number;
    stmt.free();
    return val;
  };

  const problems = count("problems");
  const translations = count("translations");
  const formalizations = count("formalizations");
  const embeddings = count("embeddings");

  const platforms: Record<string, number> = {};
  const pstmt = db.prepare("SELECT platform, COUNT(*) as cnt FROM problems GROUP BY platform");
  while (pstmt.step()) {
    const row = pstmt.getAsObject();
    platforms[row.platform as string] = row.cnt as number;
  }
  pstmt.free();

  return { problems, translations, formalizations, embeddings, platforms };
}
