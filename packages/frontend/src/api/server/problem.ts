"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from '@/lib/constants'
import {
  ProblemListResponse,
  ProblemViewResponse,
  ProblemListQuery
} from "@rmjac/api-declare";

// Re-export types for convenience
export type { ProblemStatementNode, ContentType, ProblemModel as Problem } from "@rmjac/api-declare";

/**
 * 获取题目列表
 * GET /api/problem/list
 */
export async function listProblems(query?: ProblemListQuery): Promise<ProblemListResponse> {
  try {
    const queryString = query ? new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null)
        .flatMap(([k, v]) => Array.isArray(v) ? v.map(item => [k, String(item)]) : [[k, String(v)]])
    ).toString() : '';
    
    const url = queryString ? `${API_BASE_URL}/api/problem/list?${queryString}` : `${API_BASE_URL}/api/problem/list`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to fetch problems:', error);
    throw error;
  }
}

/**
 * 获取所有题目 (兼容旧版)
 * GET /api/problem/list
 */
export async function getAllProblems(): Promise<ProblemListResponse> {
  return listProblems();
}

/**
 * 根据标识符获取题目
 * GET /api/problem/view/{iden}
 */
export async function getProblemByIden(iden: string): Promise<ProblemViewResponse> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/problem/view/${iden}`, {
      headers: {
        cookie: manage.toString()
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Failed to fetch problem ${iden}:`, error);
    throw error;
  }
}

/**
 * 查看题目 (POST方法)
 * POST /api/problem/view/{iden}
 */
export async function viewProblem(iden: string): Promise<ProblemViewResponse> {
  try {
    const manage = await cookies()
    const response = await fetch(`${API_BASE_URL}/api/problem/view/${iden}`, {
      method: 'GET',
      headers: {
        cookie: manage.toString()
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return (await response.json()).data;
  } catch (error) {
    console.error(`Failed to view problem ${iden}:`, error);
    throw error;
  }
}

// Utility function to get acceptance rate
export async function getAcceptanceRate(accepted: number, total: number): Promise<string> {
  if (total === 0) return "0%";
  return ((accepted / total) * 100).toFixed(1) + "%";
}

// Utility function to format difficulty color
 const difficultyColors: Record<string, string> = {
  "入门": "bg-green-100 text-green-800",
  "简单": "bg-blue-100 text-blue-800",
  "中等": "bg-yellow-100 text-yellow-800",
  "困难": "bg-red-100 text-red-800",
  "极限": "bg-purple-100 text-purple-800"
};

// Utility function to format status color
 const statusColors: Record<string, string> = {
  "published": "bg-green-100 text-green-800",
  "draft": "bg-gray-100 text-gray-800",
  "archived": "bg-red-100 text-red-800"
};

// Utility function to format status label
const statusLabels: Record<string, string> = {
  "published": "已发布",
  "draft": "草稿",
  "archived": "已归档"
};