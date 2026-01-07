import { get, post } from '@/lib/http'
import {
  Training,
  CreateProps,
  AddProblemToListRequest,
  AddProblemListRequest,
  ModifyListDescriptionRequest,
  RemoveProblemRequest,
  UpdateOrderRequest,
  TrainingNode,
  TrainingAddProblemResponse,
  TrainingAddListResponse,
  TrainingMessageResponse
} from '@rmjac/api-declare'

export type TrainingModel = Training;

export async function getTrainingByIden(user_iden: string, training_iden: string): Promise<{ data: TrainingModel }> {
  try {
    const response = await get<{ data: TrainingModel }>(`/api/training/view/${user_iden}/${training_iden}`)
    if (response.code !== 0) {
      throw new Error(response.msg || `Failed to fetch training ${training_iden}`)
    }
    return response.data!
  } catch (error) {
    console.error(`Failed to fetch training ${training_iden}:`, error)
    throw error
  }
}

export async function createTraining(trainingData: CreateProps): Promise<TrainingNode> {
  const response = await post<CreateProps, { data: TrainingNode }>('/api/training/create', trainingData)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to create training")
  }
  return response.data!.data
}

export async function addProblemToTrainingList(user_iden: string, training_iden: string, data: {
  list_node_id: number
  problems: string[]
}): Promise<TrainingAddProblemResponse> {
  // Map local interface to AddProblemToListRequest if needed, or just cast if structure matches
  const request: AddProblemToListRequest = data;
  const response = await post<AddProblemToListRequest, TrainingAddProblemResponse>(`/api/training/manage/${user_iden}/${training_iden}/add_problem`, request)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to add problem to training list")
  }
  return response.data!
}

export async function addProblemListToTraining(user_iden: string, training_iden: string, data: AddProblemListRequest): Promise<TrainingAddListResponse> {
  const response = await post<AddProblemListRequest, TrainingAddListResponse>(`/api/training/manage/${user_iden}/${training_iden}/add_problem_list`, data)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to add problem list to training")
  }
  return response.data!
}

export async function modifyTrainingListDescription(user_iden: string, training_iden: string, data: ModifyListDescriptionRequest): Promise<TrainingMessageResponse> {
  const response = await post<ModifyListDescriptionRequest, TrainingMessageResponse>(`/api/training/manage/${user_iden}/${training_iden}/modify_description`, data)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to modify training list description")
  }
  return response.data!
}

export async function removeProblemFromTraining(user_iden: string, training_iden: string, data: RemoveProblemRequest): Promise<TrainingMessageResponse> {
  const response = await post<RemoveProblemRequest, TrainingMessageResponse>(`/api/training/manage/${user_iden}/${training_iden}/remove_problem`, data)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to remove problem from training")
  }
  return response.data!
}

export async function updateTrainingOrder(user_iden: string, training_iden: string, data: UpdateOrderRequest): Promise<TrainingMessageResponse> {
  const response = await post<UpdateOrderRequest, TrainingMessageResponse>(`/api/training/manage/${user_iden}/${training_iden}/update_order`, data)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to update training order")
  }
  return response.data!
}