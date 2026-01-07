"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from '@/lib/constants'
import { RecordViewResponse, RecordListResponse, ListRecordsQuery } from "@rmjac/api-declare";

export async function getRecord(id: string): Promise<RecordViewResponse> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/record/view/${id}`, {
      headers: {
        cookie: manage.toString()
      }
    });
    
    const data: { code: number, data: RecordViewResponse } = await response.json()
    if (data.code !== 0) throw new Error("Failed to get record");
    return data.data
  } catch (error) {
    throw error
  }
}

export async function listRecords(query: ListRecordsQuery): Promise<RecordListResponse> {
  try {
    const manage = await cookies();
    const queryString = new URLSearchParams(
      Object.entries(query)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    
    const response = await fetch(`${API_BASE_URL}/api/record/list?${queryString}`, {
      headers: {
        cookie: manage.toString()
      }
    });
    
    const data: { code: number, data: RecordListResponse } = await response.json()
    if (data.code !== 0) throw new Error("Failed to list records");
    return data.data
  } catch (error) {
    throw error
  }
}