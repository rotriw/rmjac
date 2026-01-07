"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from '@/lib/constants'
import { Training, TrainingListStatus } from "@rmjac/api-declare";

// Re-export types for convenience
export type { Training, TrainingNode, TrainingList, TrainingProblem } from "@rmjac/api-declare";

/**
 * 获取训练详情
 * GET /api/training/view/{user_iden}/{training_iden}
 */
export async function getTrainingByIden(userIden: string, trainingIden: string): Promise<Training> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/training/view/${userIden}/${trainingIden}`, {
      headers: {
        cookie: manage.toString()
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: { data: Training } = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Failed to fetch training ${trainingIden}:`, error);
    throw error;
  }
}

/**
 * 查看训练 (POST方法)
 * POST /api/training/view/{user_iden}/{training_iden}
 */
export async function viewTraining(userIden: string, trainingIden: string): Promise<Training> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/training/view/${userIden}/${trainingIden}`, {
      method: 'POST',
      headers: {
        cookie: manage.toString()
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: { data: Training } = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Failed to view training ${trainingIden}:`, error);
    throw error;
  }
}

/**
 * 获取训练状态
 * GET /api/training/status/{user_iden}/{training_iden}
 */
export async function getTrainingStatus(userIden: string, trainingIden: string): Promise<TrainingListStatus> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/training/status/${userIden}/${trainingIden}`, {
      headers: {
        cookie: manage.toString()
      }
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data: { message: string; data: TrainingListStatus } = await response.json();
    return data.data;
  } catch (error) {
    console.error(`Failed to fetch training status ${trainingIden}:`, error);
    throw error;
  }
}