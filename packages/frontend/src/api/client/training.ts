import { get, post } from '@/lib/http'
import {
  Training,
  CreateProps,
  AddProblemToListRequest,
  AddProblemListRequest,
  ModifyListDescriptionRequest,
  RemoveProblemRequest,
  UpdateOrderRequest,
  TrainingAddProblemResponse,
  TrainingAddListResponse,
  TrainingMessageResponse,
  TrainingListStatus
} from '@rmjac/api-declare'

// Re-export type for convenience
export type TrainingModel = Training;

/**
 * 获取训练详情
 * GET /api/training/view/{user_iden}/{training_iden}
 */
export async function getTrainingByIden(userIden: string, trainingIden: string): Promise<Training> {
  const response = await get<Training>(`/api/training/view/${userIden}/${trainingIden}`)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to fetch training ${trainingIden}`)
  }
  return response.data!
}

/**
 * 查看训练 (POST方法)
 * POST /api/training/view/{user_iden}/{training_iden}
 */
export async function viewTraining(userIden: string, trainingIden: string): Promise<Training> {
  const response = await post<void, Training>(`/api/training/view/${userIden}/${trainingIden}`, undefined)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to view training ${trainingIden}`)
  }
  return response.data!
}

/**
 * 创建训练
 * POST /api/training/create
 */
export async function createTraining(trainingData: CreateProps): Promise<Training> {
  const response = await post<CreateProps, Training>('/api/training/create', trainingData)
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to create training")
  }
  return response.data!
}

/**
 * 获取训练状态
 * GET /api/training/status/{user_iden}/{training_iden}
 */
export async function getTrainingStatus(userIden: string, trainingIden: string): Promise<TrainingListStatus> {
  const response = await get<TrainingListStatus>(`/api/training/status/${userIden}/${trainingIden}`)
  if (response.code !== 0) {
    throw new Error(response.msg || `Failed to fetch training status ${trainingIden}`)
  }
  return response.data!
}

/**
 * 添加题目到训练列表
 * POST /api/training/manage/{user_iden}/{training_iden}/add_problem
 */
export async function addProblemToTrainingList(
  userIden: string, 
  trainingIden: string, 
  data: AddProblemToListRequest
): Promise<TrainingAddProblemResponse> {
  const response = await post<AddProblemToListRequest, TrainingAddProblemResponse>(
    `/api/training/manage/${userIden}/${trainingIden}/add_problem`, 
    data
  )
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to add problem to training list")
  }
  return response.data!
}

/**
 * 添加题目列表到训练
 * POST /api/training/manage/{user_iden}/{training_iden}/add_problem_list
 */
export async function addProblemListToTraining(
  userIden: string, 
  trainingIden: string, 
  data: AddProblemListRequest
): Promise<TrainingAddListResponse> {
  const response = await post<AddProblemListRequest, TrainingAddListResponse>(
    `/api/training/manage/${userIden}/${trainingIden}/add_problem_list`, 
    data
  )
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to add problem list to training")
  }
  return response.data!
}

/**
 * 修改训练列表描述
 * POST /api/training/manage/{user_iden}/{training_iden}/modify_description
 */
export async function modifyTrainingListDescription(
  userIden: string, 
  trainingIden: string, 
  data: ModifyListDescriptionRequest
): Promise<TrainingMessageResponse> {
  const response = await post<ModifyListDescriptionRequest, TrainingMessageResponse>(
    `/api/training/manage/${userIden}/${trainingIden}/modify_description`, 
    data
  )
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to modify training list description")
  }
  return response.data!
}

/**
 * 从训练中移除题目
 * POST /api/training/manage/{user_iden}/{training_iden}/remove_problem
 */
export async function removeProblemFromTraining(
  userIden: string, 
  trainingIden: string, 
  data: RemoveProblemRequest
): Promise<TrainingMessageResponse> {
  const response = await post<RemoveProblemRequest, TrainingMessageResponse>(
    `/api/training/manage/${userIden}/${trainingIden}/remove_problem`, 
    data
  )
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to remove problem from training")
  }
  return response.data!
}

/**
 * 更新训练顺序
 * POST /api/training/manage/{user_iden}/{training_iden}/update_order
 */
export async function updateTrainingOrder(
  userIden: string, 
  trainingIden: string, 
  data: UpdateOrderRequest
): Promise<TrainingMessageResponse> {
  const response = await post<UpdateOrderRequest, TrainingMessageResponse>(
    `/api/training/manage/${userIden}/${trainingIden}/update_order`, 
    data
  )
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to update training order")
  }
  return response.data!
}