import { get, post } from '@/lib/http'
import { VjudgeNode, AssignTaskReq, VjudgeTaskNode } from '@rmjac/api-declare'

export type VJudgeAccount = VjudgeNode;

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

export async function assignVJudgeTask(data: AssignTaskReq): Promise<{ code: number, msg: string, data: VjudgeTaskNode }> {
  try {
    const response = await post<AssignTaskReq, VjudgeTaskNode>('/api/vjudge/assign_task', data)
    return {
        code: response.code,
        msg: response.msg || "Success",
        data: response.data!
    }
  } catch (error) {
    console.error('Failed to assign vjudge task:', error)
    throw error
  }
}