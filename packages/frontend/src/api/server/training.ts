import { cookies } from "next/headers"
import { API_BASE_URL } from '@/lib/constants'
import { Training, TrainingAddProblemResponse } from "@rmjac/api-declare";

export async function getAllTrainings(): Promise<{ trainings: Training[], total: number }> {
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

    const data: { code: number, data: { trainings: Training[], total: number } } = await response.json()
    return data.data!
  } catch (error) {
    console.error('Failed to fetch trainings:', error)
    throw error
  }
}

export async function getTrainingByIden(user_iden: string, training_iden: string): Promise<Training> {
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

    const data: { code: number, data: Training } = await response.json()
    return data.data!
  } catch (error) {
    console.error(`Failed to fetch training ${training_iden}:`, error)
    throw error
  }
}

export async function getTrainingByNodeId(node_id: number): Promise<Training> {
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

    const data: { code: number, data: Training } = await response.json()
    return data.data!
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

export async function addProblemToTraining(training_node_id: number, problem_iden: string): Promise<TrainingAddProblemResponse> {
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

export async function checkTrainingPermission(training_iden: string, user_node_id: string): Promise<unknown> {
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