"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from './config'

// Content types for problem statements
export interface ContentType {
  type: 'text' | 'code' | 'image' | 'math' | 'typst'
  content: string
}

// Problem statement node structure
export interface ProblemStatementNode {
  node_id: number
  public: {
    statements: ContentType[]
    source: string
    creation_time: string
    iden: string
  }
}

// Problem limit node structure
export interface ProblemLimitNode {
  node_id: number
  public: {
    time_limit: number
    memory_limit: number
  }
}

// Problem tag node structure
export interface ProblemTagNode {
  node_id: number
  public: {
    tag_name: string
    tag_description: string
  }
}

// Problem node structure
export interface ProblemNode {
  node_id: number
  public: {
    name: string
    creation_time: string
  }
}

// Full problem model structure (from backend)
export interface ProblemModel {
  problem_node: ProblemNode
  problem_statement_node: Array<[ProblemStatementNode, ProblemLimitNode]>
  tag: ProblemTagNode[]
}

// Simplified problem interface for list view
export interface Problem {
  id: string
  node_id: number
  name: string
  description: string
  tags: string[]
  timeLimit: string
  memoryLimit: string
  submissionCount: number
  acceptedCount: number
  creationTime: string
  status: 'published' | 'draft' | 'archived'
}

export interface ProblemsResponse {
  problems: Problem[]
  total: number
}

export async function getAllProblems(): Promise<ProblemsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/problems`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch problems:', error)
    throw error
  }
}

export async function getProblemByIden(iden: string): Promise<ProblemModel> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/view/${iden}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
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
export const difficultyColors = {
  "入门": "bg-green-100 text-green-800",
  "简单": "bg-blue-100 text-blue-800",
  "中等": "bg-yellow-100 text-yellow-800",
  "困难": "bg-red-100 text-red-800",
  "极限": "bg-purple-100 text-purple-800"
}

// Utility function to format status color
export const statusColors = {
  "published": "bg-green-100 text-green-800",
  "draft": "bg-gray-100 text-gray-800",
  "archived": "bg-red-100 text-red-800"
}

// Utility function to format status label
export const statusLabels = {
  "published": "已发布",
  "draft": "草稿",
  "archived": "已归档"
}