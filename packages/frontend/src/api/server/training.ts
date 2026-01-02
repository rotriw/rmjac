"use server"

import { cookies } from "next/headers"
import { API_BASE_URL } from './config'

export interface TrainingNode {
  node_id: number
  public: {
    name: string
    iden: string
    description: string
    training_type: string
    start_time: string
    end_time: string
  }
  private: {
    description: string
  }
}

export interface TrainingProblem {
  ProblemIden?: string
  ProblemTraining?: TrainingList
  ProblemPresetTraining?: [number, string]
  ExistTraining?: [number, string]
}

export interface TrainingList {
  description: string
  own_problem: TrainingProblem[]
}

export interface TrainingModel {
  training_node: TrainingNode
  problem_list: TrainingList
}

export interface Training {
  node_id: number
  name: string
  iden: string
  description: string
  training_type: string
  start_time: string
  end_time: string
}

export interface TrainingsResponse {
  trainings: Training[]
  total: number
}

export async function getAllTrainings(): Promise<TrainingsResponse> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/training/trainings`, {
      headers: {
        cookie: manage.toString()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch trainings:', error)
    throw error
  }
}

export async function getTrainingByIden(user_iden: string, training_iden: string): Promise<TrainingModel> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/training/view/${user_iden}/${training_iden}`, {
      headers: {
        cookie: manage.toString()
      }
    })

    if (!response.ok) {
      console.log(await response.json());
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to fetch training ${training_iden}:`, error)
    throw error
  }
}

export async function getTrainingByNodeId(node_id: number): Promise<any> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/training/training/node/${node_id}`, {
      headers: {
        cookie: manage.toString()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to fetch training node ${node_id}:`, error)
    throw error
  }
}

export async function deleteTraining(user_iden: string, training_iden: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/training/${user_iden}/${training_iden}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.error(`Failed to delete training ${training_iden}:`, error)
    throw error
  }
}

export async function addProblemToTraining(training_node_id: number, problem_iden: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/training/${training_node_id}/add_problem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({problem_iden}),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to add problem to training:', error)
    throw error
  }
}

export async function checkTrainingPermission(training_iden: string, user_node_id: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/training/${training_iden}/check-permission/${user_node_id}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to check training permission:', error)
    throw error
  }
}