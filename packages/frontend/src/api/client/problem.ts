import { get, post } from '@/lib/http'
import { 
  CreateProblemProps, 
  ContentType, 
  ProblemViewResponse, 
  ProblemModel, 
  ProblemUpdateResponse,
  ProblemStatementProp,
  ProblemListQuery,
  ProblemListResponse
} from '@rmjac/api-declare'

/**
 * 创建题目
 * POST /api/problem/create
 */
export async function createProblem(problemData: CreateProblemProps): Promise<ProblemModel> {
  const response = await post<CreateProblemProps, ProblemModel>('/api/problem/create', problemData)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to create problem.")
  }
  return response.data!
}

/**
 * 获取题目列表
 * GET /api/problem/list
 */
export async function listProblems(query?: ProblemListQuery): Promise<ProblemListResponse> {
  const queryString = query ? '?' + new URLSearchParams(
    Object.entries(query)
      .filter(([, v]) => v !== undefined && v !== null)
      .flatMap(([k, v]) => Array.isArray(v) ? v.map(item => [k, String(item)]) : [[k, String(v)]])
  ).toString() : '';
  
  const response = await get<ProblemListResponse>(`/api/problem/list${queryString}`)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to list problems.")
  }
  return response.data!
}

/**
 * 获取题目详情 (用于编辑)
 * GET /api/problem/view/{iden}
 */
export async function getProblemForEdit(iden: string): Promise<ProblemViewResponse> {
  const response = await get<ProblemViewResponse>(`/api/problem/view/${iden}`)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to fetch problem ${iden}`)
  }
  return response.data!
}

/**
 * 查看题目
 * POST /api/problem/view/{iden}
 */
export async function viewProblem(iden: string): Promise<ProblemViewResponse> {
  const response = await post<void, ProblemViewResponse>(`/api/problem/view/${iden}`, undefined)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to view problem ${iden}`)
  }
  return response.data!
}

/**
 * 删除题目
 * POST /api/problem/manage/{iden}/delete
 */
export async function deleteProblem(iden: string): Promise<{ message: string }> {
  const response = await post<void, { message: string }>(`/api/problem/manage/${iden}/delete`, undefined)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to delete problem ${iden}`)
  }
  return response.data!
}

/**
 * 添加题目陈述
 * POST /api/problem/manage/{iden}/add_statement
 */
export async function addStatement(iden: string, statement: ProblemStatementProp): Promise<ProblemUpdateResponse> {
  const response = await post<ProblemStatementProp, ProblemUpdateResponse>(`/api/problem/manage/${iden}/add_statement`, statement)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to add statement to problem ${iden}`)
  }
  return response.data!
}

/**
 * 更新题目陈述内容
 * POST /api/problem/manage/{iden}/update_statement_content
 */
export async function updateProblemStatement(iden: string, content: ContentType[]): Promise<ProblemUpdateResponse> {
  const response = await post<ContentType[], ProblemUpdateResponse>(`/api/problem/manage/${iden}/update_statement_content`, content)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to update problem statement ${iden}`)
  }
  return response.data!
}

/**
 * 更新题目陈述来源
 * POST /api/problem/manage/{iden}/update_statement_source
 */
export async function updateProblemSource(iden: string, source: string): Promise<ProblemUpdateResponse> {
  const response = await post<string, ProblemUpdateResponse>(`/api/problem/manage/${iden}/update_statement_source`, source)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to update problem source ${iden}`)
  }
  return response.data!
}

/**
 * 添加标识符
 * POST /api/problem/manage/{iden}/add_iden
 */
export async function addProblemIden(iden: string, newIden: string): Promise<{ message: string }> {
  const response = await post<string, { message: string }>(`/api/problem/manage/${iden}/add_iden`, newIden)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to add iden to problem ${iden}`)
  }
  return response.data!
}

/**
 * 添加编辑者
 * POST /api/problem/manage/{iden}/perm/add_editor
 */
export async function addEditor(iden: string, userId: number): Promise<{ message: string }> {
  const response = await post<number, { message: string }>(`/api/problem/manage/${iden}/perm/add_editor`, userId)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to add editor to problem ${iden}`)
  }
  return response.data!
}

/**
 * 移除编辑者
 * POST /api/problem/manage/{iden}/perm/remove_editor
 */
export async function removeEditor(iden: string, userId: number): Promise<{ message: string }> {
  const response = await post<number, { message: string }>(`/api/problem/manage/${iden}/perm/remove_editor`, userId)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to remove editor from problem ${iden}`)
  }
  return response.data!
}

/**
 * 查看编辑者
 * POST /api/problem/manage/{iden}/perm/view_editor
 */
export async function viewEditors(iden: string): Promise<{ message: string }> {
  const response = await post<void, { message: string }>(`/api/problem/manage/${iden}/perm/view_editor`, undefined)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to view editors of problem ${iden}`)
  }
  return response.data!
}

/**
 * 添加访客
 * POST /api/problem/manage/{iden}/perm/add_visitor
 */
export async function addVisitor(iden: string, userId: number): Promise<{ message: string }> {
  const response = await post<number, { message: string }>(`/api/problem/manage/${iden}/perm/add_visitor`, userId)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to add visitor to problem ${iden}`)
  }
  return response.data!
}

/**
 * 移除访客
 * POST /api/problem/manage/{iden}/perm/remove_visitor
 */
export async function removeVisitor(iden: string, userId: number): Promise<{ message: string }> {
  const response = await post<number, { message: string }>(`/api/problem/manage/${iden}/perm/remove_visitor`, userId)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to remove visitor from problem ${iden}`)
  }
  return response.data!
}

/**
 * 查看访客
 * POST /api/problem/manage/{iden}/perm/view_visitor
 */
export async function viewVisitors(iden: string): Promise<{ message: string }> {
  const response = await post<void, { message: string }>(`/api/problem/manage/${iden}/perm/view_visitor`, undefined)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to view visitors of problem ${iden}`)
  }
  return response.data!
}

/**
 * 转移题目所有权
 * POST /api/problem/manage/{iden}/transfer_owner
 */
export async function transferOwner(iden: string, newOwnerId: number): Promise<{ message: string }> {
  const response = await post<number, { message: string }>(`/api/problem/manage/${iden}/transfer_owner`, newOwnerId)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to transfer owner of problem ${iden}`)
  }
  return response.data!
}