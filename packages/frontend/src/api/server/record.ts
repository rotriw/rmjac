"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from '@/lib/constants'
import { RecordViewResponse, RecordListResponse, ListRecordsQuery } from "@rmjac/api-declare";

// Re-export types for convenience
export type { RecordNode, RecordEdge, RecordStatus, RecordListItem, SubtaskUserRecord } from "@rmjac/api-declare";

/**
 * 获取记录详情
 * GET /api/record/view/{record_id}
 */
export async function getRecord(id: string): Promise<RecordViewResponse> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/record/view/${id}`, {
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
    console.error(`Failed to get record ${id}:`, error);
    throw error;
  }
}

/**
 * 获取记录列表
 * GET /api/record/list
 */
export async function listRecords(query: ListRecordsQuery): Promise<RecordListResponse> {
  try {
    const manage = await cookies();
    const queryString = new URLSearchParams(
      Object.entries(query)
        .filter(([, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    
    const response = await fetch(`${API_BASE_URL}/api/record/list?${queryString}`, {
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
    console.error('Failed to list records:', error);
    throw error;
  }
}

/**
 * 获取用户在某题目的提交状态
 * GET /api/record/status/{problem_iden}
 */
export async function getRecordStatus(problemIden: string): Promise<{
  user_id: number;
  problem_id: number;
  status: unknown;
}> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/record/status/${problemIden}`, {
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
    console.error(`Failed to get record status for ${problemIden}:`, error);
    throw error;
  }
}