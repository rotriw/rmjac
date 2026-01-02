"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from './config'

export interface VJudgeAccount {
  node_id: number;
  public: {
    platform: string;
    verified: boolean;
    iden: string;
    verified_code: string;
    creation_time: string;
    updated_at: string;
    remote_mode: string;
  };
  private: {
    auth?: {
      Password?: string;
      Token?: string;
    } | null;
  };
}

export interface VJudgeTask {
  node_id: number;
  public: {
    status: string;
    log: string;
    created_at: string;
    updated_at: string;
  };
}

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

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to fetch vjudge accounts:', error)
    return []
  }
}

export async function bindVJudgeAccount(data: {
  platform: string,
  remote_mode: number,
  auth?: { Password?: string, Token?: string },
  bypass_check?: boolean,
  ws_id?: string
}): Promise<any> {
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

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to list vjudge accounts by ids:', error)
    throw error
  }
}

export async function deleteVJudgeAccount(nodeId: number): Promise<any> {
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

export async function updateVJudgeAccount(data: {
  node_id: number,
  auth?: { Password?: string, Token?: string }
}): Promise<any> {
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

    const data = await response.json()
    return data.data
  } catch (error) {
    console.error('Failed to get vjudge account detail:', error)
    throw error
  }
}

export async function assignVJudgeTask(data: {
  vjudge_node_id: number,
  range: string,
  ws_id?: string
}): Promise<any> {
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

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to list vjudge tasks:', error)
    return []
  }
}