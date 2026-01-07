"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from '@/lib/constants'
import { 
  VjudgeNode, 
  VjudgeTaskNode, 
  BindAccountReq, 
  UpdateAccountReq, 
  AssignTaskReq, 
  VjudgeResponse,
  ListByIdsReq
} from "@rmjac/api-declare";

// Re-export types for convenience
export type VJudgeAccount = VjudgeNode;
export type VJudgeTask = VjudgeTaskNode;

/**
 * 获取我的 VJudge 账号列表
 * GET /api/vjudge/my_accounts
 */
export async function getMyVJudgeAccounts(): Promise<VJudgeAccount[]> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/my_accounts`, {
      headers: {
        cookie: manage.toString()
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: { code: number; data: VJudgeAccount[] } = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to fetch vjudge accounts:', error);
    return [];
  }
}

/**
 * 绑定 VJudge 账号
 * POST /api/vjudge/bind
 */
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
    });

    return await response.json();
  } catch (error) {
    console.error('Failed to bind vjudge account:', error);
    throw error;
  }
}

/**
 * 根据 ID 列表查询账号
 * POST /api/vjudge/list_by_ids
 */
export async function listVJudgeAccountsByIds(ids: number[]): Promise<VJudgeAccount[]> {
  try {
    const manage = await cookies();
    const reqData: ListByIdsReq = { ids };
    const response = await fetch(`${API_BASE_URL}/api/vjudge/list_by_ids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: manage.toString()
      },
      body: JSON.stringify(reqData),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: { code: number; data: VJudgeAccount[] } = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to list vjudge accounts by ids:', error);
    throw error;
  }
}

/**
 * 获取账号详情
 * GET /api/vjudge/account/{node_id}
 */
export async function getVJudgeAccountDetail(nodeId: number): Promise<VJudgeAccount> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/account/${nodeId}`, {
      headers: {
        cookie: manage.toString()
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: { code: number; data: VJudgeAccount } = await response.json();
    return data.data;
  } catch (error) {
    console.error('Failed to get vjudge account detail:', error);
    throw error;
  }
}

/**
 * 删除 VJudge 账号
 * DELETE /api/vjudge/account/{node_id}
 */
export async function deleteVJudgeAccount(nodeId: number): Promise<VjudgeResponse<void>> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/account/${nodeId}`, {
      method: 'DELETE',
      headers: {
        cookie: manage.toString()
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to delete vjudge account:', error);
    throw error;
  }
}

/**
 * 更新 VJudge 账号
 * PUT /api/vjudge/account
 */
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
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Failed to update vjudge account:', error);
    throw error;
  }
}

/**
 * 获取账号的任务列表
 * GET /api/vjudge/tasks/{node_id}
 */
export async function listVJudgeTasks(nodeId: number): Promise<VJudgeTask[]> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/tasks/${nodeId}`, {
      headers: {
        cookie: manage.toString()
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: { code: number; data: VJudgeTask[] } = await response.json();
    return data.data || [];
  } catch (error) {
    console.error('Failed to list vjudge tasks:', error);
    return [];
  }
}

/**
 * 分配任务
 * POST /api/vjudge/assign_task
 */
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
    });

    return await response.json();
  } catch (error) {
    console.error('Failed to assign vjudge task:', error);
    throw error;
  }
}