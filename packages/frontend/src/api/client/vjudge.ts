import { get, post, put, del } from '@/lib/http'
import { 
  VjudgeNode, 
  VjudgeTaskNode, 
  AssignTaskReq, 
  BindAccountReq, 
  UpdateAccountReq,
  ListByIdsReq,
  VjudgeResponse
} from '@rmjac/api-declare'

// Re-export type for convenience
export type VJudgeAccount = VjudgeNode;
export type VJudgeTask = VjudgeTaskNode;

/**
 * 获取我的 VJudge 账号列表
 * GET /api/vjudge/my_accounts
 */
export async function getMyVJudgeAccounts(): Promise<VJudgeAccount[]> {
  try {
    const response = await get<VJudgeAccount[]>('/api/vjudge/my_accounts')
    if (response.code !== 0) {
      throw new Error(response.msg || "Failed to fetch vjudge accounts")
    }
    return response.data || []
  } catch (error) {
    console.error('Failed to fetch vjudge accounts:', error)
    return []
  }
}

/**
 * 绑定 VJudge 账号
 * POST /api/vjudge/bind
 */
export async function bindVJudgeAccount(data: BindAccountReq): Promise<VjudgeResponse<VjudgeNode>> {
  const response = await post<BindAccountReq, VjudgeNode>('/api/vjudge/bind', data)
  return {
    code: response.code,
    msg: response.msg || "Success",
    data: response.data
  }
}

/**
 * 根据 ID 列表查询账号
 * POST /api/vjudge/list_by_ids
 */
export async function listVJudgeAccountsByIds(ids: number[]): Promise<VJudgeAccount[]> {
  const reqData: ListByIdsReq = { ids }
  const response = await post<ListByIdsReq, VJudgeAccount[]>('/api/vjudge/list_by_ids', reqData)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to list vjudge accounts by ids")
  }
  return response.data || []
}

/**
 * 获取账号详情
 * GET /api/vjudge/account/{node_id}
 */
export async function getVJudgeAccountDetail(nodeId: number): Promise<VJudgeAccount> {
  const response = await get<VJudgeAccount>(`/api/vjudge/account/${nodeId}`)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to get vjudge account detail")
  }
  return response.data!
}

/**
 * 删除 VJudge 账号
 * DELETE /api/vjudge/account/{node_id}
 */
export async function deleteVJudgeAccount(nodeId: number): Promise<VjudgeResponse<void>> {
  const response = await del<void>(`/api/vjudge/account/${nodeId}`)
  return {
    code: response.code,
    msg: response.msg || "Deleted"
  }
}

/**
 * 更新 VJudge 账号
 * PUT /api/vjudge/account
 */
export async function updateVJudgeAccount(data: UpdateAccountReq): Promise<VjudgeResponse<void>> {
  const response = await put<UpdateAccountReq, void>('/api/vjudge/account', data)
  return {
    code: response.code,
    msg: response.msg || "Update success"
  }
}

/**
 * 获取账号的任务列表
 * GET /api/vjudge/tasks/{node_id}
 */
export async function listVJudgeTasks(nodeId: number): Promise<VJudgeTask[]> {
  try {
    const response = await get<VJudgeTask[]>(`/api/vjudge/tasks/${nodeId}`)
    if (response.code !== 0) {
      throw new Error(response.msg || "Failed to list vjudge tasks")
    }
    return response.data || []
  } catch (error) {
    console.error('Failed to list vjudge tasks:', error)
    return []
  }
}

/**
 * 分配任务
 * POST /api/vjudge/assign_task
 */
export async function assignVJudgeTask(data: AssignTaskReq): Promise<VjudgeResponse<VjudgeTaskNode>> {
  const response = await post<AssignTaskReq, VjudgeTaskNode>('/api/vjudge/assign_task', data)
  return {
    code: response.code,
    msg: response.msg || "Task assigned",
    data: response.data
  }
}