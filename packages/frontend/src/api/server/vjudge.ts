"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from '@/lib/constants'
import { VjudgeNode, VjudgeTaskNode, BindAccountReq, UpdateAccountReq, AssignTaskReq, VjudgeResponse } from "@rmjac/api-declare";

export type VJudgeAccount = VjudgeNode;
export type VJudgeTask = VjudgeTaskNode;

export async function getMyVJudgeAccounts(): Promise<VJudgeAccount[]> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/my_accounts`, {
      headers: {
        cookie: manage.toString()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: { code: number, data: VJudgeAccount[] } = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to fetch vjudge accounts:', error)
    return []
  }
}

export async function bindVJudgeAccount(data: BindAccountReq): Promise<VjudgeResponse<VjudgeNode>> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/bind`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: manage.toString()
      },
      body: JSON.stringify(data),
    })

    return await response.json()
  } catch (error) {
    console.error('Failed to bind vjudge account:', error)
    throw error
  }
}

export async function listVJudgeAccountsByIds(ids: number[]): Promise<VJudgeAccount[]> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/list_by_ids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: manage.toString()
      },
      body: JSON.stringify({ ids }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: { code: number, data: VJudgeAccount[] } = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to list vjudge accounts by ids:', error)
    throw error
  }
}

export async function deleteVJudgeAccount(nodeId: number): Promise<VjudgeResponse<void>> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/account/${nodeId}`, {
      method: 'DELETE',
      headers: {
        cookie: manage.toString()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to delete vjudge account:', error)
    throw error
  }
}

export async function updateVJudgeAccount(data: UpdateAccountReq): Promise<VjudgeResponse<void>> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/account`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: manage.toString()
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to update vjudge account:', error)
    throw error
  }
}

export async function getVJudgeAccountDetail(nodeId: number): Promise<VJudgeAccount> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/account/${nodeId}`, {
      headers: {
        cookie: manage.toString()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: { code: number, data: VJudgeAccount } = await response.json()
    return data.data
  } catch (error) {
    console.error('Failed to get vjudge account detail:', error)
    throw error
  }
}

export async function assignVJudgeTask(data: AssignTaskReq): Promise<VjudgeResponse<VjudgeTaskNode>> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/assign_task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: manage.toString()
      },
      body: JSON.stringify(data),
    })

    return await response.json()
  } catch (error) {
    console.error('Failed to assign vjudge task:', error)
    throw error
  }
}

export async function listVJudgeTasks(nodeId: number): Promise<VJudgeTask[]> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/tasks/${nodeId}`, {
      headers: {
        cookie: manage.toString()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data: { code: number, data: VJudgeTask[] } = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to list vjudge tasks:', error)
    return []
  }
}