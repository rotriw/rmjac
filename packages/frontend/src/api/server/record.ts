"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from './config'

export async function getRecord(id: string): Promise<any> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/record/view/${id}`, {
      headers: {
        cookie: manage.toString()
      }
    });
    
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function listRecords(query: any): Promise<any> {
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
    
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}