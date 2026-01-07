import { get, post } from '@/lib/http'
import { CreateProblemProps, ContentType, ProblemViewResponse, ProblemModel, ProblemUpdateResponse } from '@rmjac/api-declare'

export async function createProblem(problemData: CreateProblemProps): Promise<ProblemModel> {
  const response = await post<CreateProblemProps, { data: ProblemModel }>('/api/problem/create', problemData)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to create problem.")
  }
  return response.data!.data!
}

export async function deleteProblem(iden: string): Promise<void> {
  const response = await post<string, void>(`/api/problem/manage/${iden}/delete`, "")
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to delete problem ${iden}`)
  }
}

export async function getProblemForEdit(iden: string): Promise<ProblemViewResponse> {
  const response = await get<ProblemViewResponse>(`/api/problem/view/${iden}`)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to fetch problem ${iden}`)
  }
  return response.data!
}

export async function updateProblemStatement(iden: string, content: ContentType[]): Promise<ProblemUpdateResponse> {
  const response = await post<ContentType[], ProblemUpdateResponse>(`/api/problem/manage/${iden}/update_statement_content`, content)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to update problem statement ${iden}`)
  }
  return response.data!
}

export async function updateProblemSource(iden: string, source: string): Promise<ProblemUpdateResponse> {
  const response = await post<string, ProblemUpdateResponse>(`/api/problem/manage/${iden}/update_statement_source`, source)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to update problem source ${iden}`)
  }
  return response.data!
}