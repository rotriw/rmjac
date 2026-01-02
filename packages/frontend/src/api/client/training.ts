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
  ProblemIden?: [number, string]
  ProblemTraining?: TrainingList
  ProblemPresetTraining?: [number, string]
  ExistTraining?: [number, string]
}

export interface TrainingList {
  node_id: number
  description: string
  own_problem: TrainingProblem[]
}

export interface TrainingModel {
  training_node: TrainingNode
  problem_list: TrainingList
}

export async function getTrainingByIden(user_iden: string, training_iden: string): Promise<{ data: TrainingModel }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/view/${user_iden}/${training_iden}`, {
      credentials: 'include',
    })

    if (!response.ok) {
      console.error(`Failed to fetch training ${training_iden}:`, await response.json())
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to fetch training ${training_iden}:`, error)
    throw error
  }
}

export async function createTraining(trainingData: {
  iden: string
  title: string
  description_public: string
  description_private: string
  start_time: string
  end_time: string
  training_type: string
  problem_list: {
    description: string
    own_problem: any[]
  }
  write_perm_user: number[]
  read_perm_user: number[]
}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(trainingData),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to create training:', error)
    throw error
  }
}

export async function addProblemToTrainingList(user_iden: string, training_iden: string, data: {
  list_node_id: number
  problems: string[]
}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/manage/${user_iden}/${training_iden}/add_problem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    return await response.json()
  } catch (error) {
    console.error('Failed to add problem to training list:', error)
    throw error
  }
}

export async function addProblemListToTraining(user_iden: string, training_iden: string, data: {
  list_node_id: number
  problem_list: any
}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/manage/${user_iden}/${training_iden}/add_problem_list`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    return await response.json()
  } catch (error) {
    console.error('Failed to add problem list to training:', error)
    throw error
  }
}

export async function modifyTrainingListDescription(user_iden: string, training_iden: string, data: {
  list_node_id: number
  description_public: string
  description_private: string
}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/manage/${user_iden}/${training_iden}/modify_description`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    return await response.json()
  } catch (error) {
    console.error('Failed to modify training list description:', error)
    throw error
  }
}

export async function removeProblemFromTraining(user_iden: string, training_iden: string, data: {
  list_node_id: number
  delete_node_id: number
}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/manage/${user_iden}/${training_iden}/remove_problem`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    return await response.json()
  } catch (error) {
    console.error('Failed to remove problem from training:', error)
    throw error
  }
}

export async function updateTrainingOrder(user_iden: string, training_iden: string, data: {
  list_node_id: number
  orders: [number, number][]
}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/manage/${user_iden}/${training_iden}/update_order`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(data),
    })
    return await response.json()
  } catch (error) {
    console.error('Failed to update training order:', error)
    throw error
  }
}