/**
 * 格式转换模块
 *
 * vjudge 本地格式 → 后端 api_declare ProblemStatement 格式
 *
 * 后端支持的 statement_type: "Markdown" | "Html" | "Pdf" | "Typst"
 * CF/AT 存储的题面是 Markdown 格式（HTML 已在抓取时经 Turndown 转换）
 */

import { getDb, queryOne } from "./connection.ts";

// ============================================================
// 后端类型
// ============================================================

export type ProblemStatementType = "Markdown" | "Html" | "Pdf" | "Typst";
export type DescriptionType = "Markdown" | "Html" | "Typst";
export type Language = "Chinese" | "English" | "Japanese" | "Russian";

export interface BackendProblemStatement {
  statement_type: ProblemStatementType;
  content: string;
  is_translate: boolean;
  language: Language;
}

export interface BackendDescription {
  content: string;
  description_type: DescriptionType;
}

export interface BackendProblem {
  name: string;
  description: BackendDescription;
  platform: string;
  limit: { time: number; memory: number };
  difficulty: { None: null } | { Number: number };
  is_remote: boolean;
  is_sync: boolean;
  sync_url: string | null;
  sign: string | null;
}

// ============================================================
// 格式转换
// ============================================================

interface ContentType { iden: string; content: string; }

export function convertToBackendStatements(
  rawStatements: ContentType[],
  translatedStatements?: ContentType[] | string | null,
): BackendProblemStatement[] {
  const results: BackendProblemStatement[] = [];

  const rawContent = mergeStatements(rawStatements);
  if (rawContent) {
    results.push({
      statement_type: "Markdown",
      content: processMarkdownContent(rawContent),
      is_translate: false,
      language: "English",
    });
  }

  if (translatedStatements) {
    let translated: string;
    if (typeof translatedStatements === "string") {
      try {
        translated = mergeStatements(JSON.parse(translatedStatements));
      } catch { translated = translatedStatements; }
    } else {
      translated = mergeStatements(translatedStatements);
    }
    if (translated) {
      results.push({
        statement_type: "Markdown",
        content: processMarkdownContent(translated),
        is_translate: true,
        language: "Chinese",
      });
    }
  }

  return results;
}

export function convertToBackendProblem(iden: string): BackendProblem | null {
  const db = getDb();
  const row = queryOne(db, `
    SELECT p.iden, p.name, p.platform, p.raw_statement, p.time_limit, p.memory_limit, p.difficulty
    FROM problems p WHERE p.iden = ?`, [iden]);
  if (!row) return null;

  const platformMap: Record<string, string> = {
    codeforces: "Codeforces", atcoder: "AtCoder", luogu: "Luogu",
  };

  const rawStmts: ContentType[] = JSON.parse((row.raw_statement as string) || "[]");
  const descContent = (rawStmts.find(s => s.iden === "statement" || s.iden === "problem statement")?.content || "")
    .slice(0, 200).replace(/\n+/g, " ");

  return {
    name: cleanName(row.name as string),
    description: { content: descContent, description_type: "Markdown" },
    platform: platformMap[row.platform as string] || row.platform as string,
    limit: {
      time: (row.time_limit as number) || 2000,
      memory: (row.memory_limit as number) ? Math.round((row.memory_limit as number) / 1024) : 256,
    },
    difficulty: row.difficulty ? { Number: row.difficulty as number } : { None: null },
    is_remote: true,
    is_sync: true,
    sync_url: null,
    sign: row.iden as string,
  };
}

export function exportProblem(iden: string): {
  problem: BackendProblem;
  statements: BackendProblemStatement[];
} | null {
  const problem = convertToBackendProblem(iden);
  if (!problem) return null;

  const db = getDb();
  const row = queryOne(db, `
    SELECT p.raw_statement, t.translated_statement
    FROM problems p LEFT JOIN translations t ON p.iden = t.iden
    WHERE p.iden = ?`, [iden]);

  const rawStmts: ContentType[] = JSON.parse((row?.raw_statement as string) || "[]");
  const statements = convertToBackendStatements(rawStmts, row?.translated_statement as string);
  return { problem, statements };
}

// ============================================================
// 辅助函数
// ============================================================

function processMarkdownContent(content: string): string {
  return content
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function mergeStatements(statements: ContentType[]): string {
  if (!statements?.length) return "";

  const ORDER: Record<string, number> = {
    "statement": 0, "problem statement": 0,
    "constraints": 1, "input": 2, "output": 3, "note": 10,
  };

  const sorted = [...statements].sort((a, b) => {
    const oa = ORDER[a.iden] ?? (a.iden.startsWith("sample") ? 5 : 8);
    const ob = ORDER[b.iden] ?? (b.iden.startsWith("sample") ? 5 : 8);
    return oa !== ob ? oa - ob : a.iden.localeCompare(b.iden);
  });

  return sorted
    .filter(s => s.content?.trim())
    .map(s => {
      if (s.iden === "statement" || s.iden === "problem statement") return s.content;
      const title = s.iden.split(/[\s_]+/).map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      return `## ${title}\n\n${s.content}`;
    })
    .join("\n\n");
}

function cleanName(name: string): string {
  return name.replace(/\n\t+Editorial$/i, "").replace(/\s+Editorial$/i, "").trim();
}
