/**
 * 语义搜索服务
 */

import OpenAI from "openai";
import { getDb, queryAll, queryOne } from "./connection.ts";

// ============================================================
// 类型
// ============================================================

interface EmbeddingEntry {
  iden: string;
  name: string;
  embedding: number[];
}

export interface SearchResult {
  iden: string;
  name: string;
  similarity: number;
  platform?: string;
  raw_statement?: string;
  translated_statement?: string;
  formal_statement?: string;
  simple_statement?: string;
}

// ============================================================
// 缓存
// ============================================================

let _cached: EmbeddingEntry[] | null = null;

export function loadEmbeddings(forceReload = false): EmbeddingEntry[] {
  if (_cached && !forceReload) return _cached;

  const db = getDb();
  console.log("[搜索] 加载 embeddings...");
  const t0 = Date.now();

  const rows = queryAll(db, "SELECT iden, name, embedding FROM embeddings");

  _cached = rows.map(row => ({
    iden: row.iden as string,
    name: row.name as string,
    embedding: JSON.parse(row.embedding as string),
  }));

  console.log(`[搜索] 已加载 ${_cached.length} 条 (${((Date.now() - t0) / 1000).toFixed(2)}s)`);
  return _cached;
}

export function clearEmbeddingsCache(): void { _cached = null; }

// ============================================================
// 搜索
// ============================================================

export function searchByVector(queryEmbedding: number[], topK = 10): SearchResult[] {
  const embeddings = loadEmbeddings();
  const results = embeddings.map(e => ({
    iden: e.iden,
    name: e.name,
    similarity: cosineSimilarity(queryEmbedding, e.embedding),
  }));
  results.sort((a, b) => b.similarity - a.similarity);
  return results.slice(0, topK);
}

export async function searchByText(
  query: string,
  topK = 10,
  options: { simplify?: boolean; embeddingModel?: string } = {}
): Promise<SearchResult[]> {
  const { simplify = true, embeddingModel = "bge-m3" } = options;
  const config = getAIConfig();
  const client = new OpenAI({ apiKey: config.apiKey, baseURL: config.baseURL });

  let processedQuery = query;

  if (simplify) {
    console.log("[搜索] 简化查询...");
    try {
      const response = await client.chat.completions.create({
        model: "qwen/qwen3-next-80b-a3b-instruct",
        messages: [
          { role: "system", content: `Simplify the problem statement. Output ONLY a concise English description.` },
          { role: "user", content: query },
        ],
      });
      processedQuery = response.choices[0].message?.content || query;
      console.log("[搜索] 简化:", processedQuery.slice(0, 100));
    } catch { console.warn("[搜索] 简化失败，使用原始查询"); }
  }

  console.log("[搜索] 生成向量...");
  const emb = await client.embeddings.create({
    model: embeddingModel, input: processedQuery, encoding_format: "float",
  });

  return searchByVector(emb.data[0].embedding, topK);
}

export async function searchEnriched(
  query: string,
  topK = 10,
  options: { simplify?: boolean; embeddingModel?: string } = {}
): Promise<SearchResult[]> {
  const results = await searchByText(query, topK, options);
  const db = getDb();

  return results.map(r => {
    const row = queryOne(db, `
      SELECT p.platform, p.raw_statement, t.translated_statement,
             f.formal_statement, f.simple_statement
      FROM problems p
      LEFT JOIN translations t ON p.iden = t.iden
      LEFT JOIN formalizations f ON p.iden = f.iden
      WHERE p.iden = ?`, [r.iden]);

    return {
      ...r,
      platform: row?.platform as string,
      raw_statement: row?.raw_statement as string,
      translated_statement: row?.translated_statement as string,
      formal_statement: row?.formal_statement as string,
      simple_statement: row?.simple_statement as string,
    };
  });
}

// ============================================================
// 辅助
// ============================================================

function getAIConfig() {
  const apiKey = process.env.ONEAPI_KEY;
  const baseURL = process.env.ONEAPI_BASEURL || "https://oneapi.wanghu.rcfortress.site:8443/v1";
  if (!apiKey) throw new Error("未设置 ONEAPI_KEY");
  return { apiKey, baseURL };
}

function cosineSimilarity(a: number[], b: number[]): number {
  let dot = 0, magA = 0, magB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    magA += a[i] * a[i];
    magB += b[i] * b[i];
  }
  magA = Math.sqrt(magA);
  magB = Math.sqrt(magB);
  return (magA === 0 || magB === 0) ? 0 : dot / (magA * magB);
}
