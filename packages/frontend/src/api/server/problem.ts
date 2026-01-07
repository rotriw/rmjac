"use server"

import { API_BASE_URL } from '@/lib/constants'
import { ProblemListResponse, ProblemViewResponse } from "@rmjac/api-declare";

export async function getAllProblems(): Promise<ProblemListResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/list`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: { code: number, data: ProblemListResponse } = await response.json()
    return data.data!
  } catch (error) {
    console.error('Failed to fetch problems:', error)
    throw error
  }
}

export async function getProblemByIden(iden: string): Promise<ProblemViewResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/view/${iden}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: { code: number, data: ProblemViewResponse } = await response.json()
    return data.data!
  } catch (error) {
    console.error(`Failed to fetch problem ${iden}:`, error)
    throw error
  }
}

// Utility function to get acceptance rate
export async function getAcceptanceRate(accepted: number, total: number): Promise<string> {
  if (total === 0) return "0%"
  return ((accepted / total) * 100).toFixed(1) + "%"
}

// Utility function to format difficulty color
export const difficultyColors: Record<string, string> = {
  "入门": "bg-green-100 text-green-800",
  "简单": "bg-blue-100 text-blue-800",
  "中等": "bg-yellow-100 text-yellow-800",
  "困难": "bg-red-100 text-red-800",
  "极限": "bg-purple-100 text-purple-800"
}

// Utility function to format status color
export const statusColors: Record<string, string> = {
  "published": "bg-green-100 text-green-800",
  "draft": "bg-gray-100 text-gray-800",
  "archived": "bg-red-100 text-red-800"
}

// Utility function to format status label
export const statusLabels: Record<string, string> = {
  "published": "已发布",
  "draft": "草稿",
  "archived": "已归档"
}