// API utility functions for the frontend
"use server"

import { cookies } from "next/headers"

// Remove cookies import to avoid server-side dependency issues

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1824'

// Content types for problem statements
export interface ContentType {
  type: 'text' | 'code' | 'image' | 'math' | 'typst'
  content: string
}

// Problem statement node structure
export interface ProblemStatementNode {
  node_id: number
  public: {
    statements: ContentType[]
    source: string
    creation_time: string
    iden: string
  }
}

// Problem limit node structure
export interface ProblemLimitNode {
  node_id: number
  public: {
    time_limit: number
    memory_limit: number
  }
}

// Problem tag node structure
export interface ProblemTagNode {
  node_id: number
  public: {
    tag_name: string
    tag_description: string
  }
}

// Problem node structure
export interface ProblemNode {
  node_id: number
  public: {
    name: string
    creation_time: string
  }
}

// Full problem model structure (from backend)
export interface ProblemModel {
  problem_node: ProblemNode
  problem_statement_node: Array<[ProblemStatementNode, ProblemLimitNode]>
  tag: ProblemTagNode[]
}

// Simplified problem interface for list view
export interface Problem {
  id: string
  node_id: number
  name: string
  description: string
  tags: string[]
  timeLimit: string
  memoryLimit: string
  submissionCount: number
  acceptedCount: number
  creationTime: string
  status: 'published' | 'draft' | 'archived'
}

export interface ProblemsResponse {
  problems: Problem[]
  total: number
}

export interface ApiResponse<T> {
  data?: T
  error?: string
  message?: string
}

// Problem API functions
export async function getAllProblems(): Promise<ProblemsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/problems`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to fetch problems:', error)
    throw error
  }
}

export async function getProblemByIden(iden: string): Promise<ProblemModel> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/view/${iden}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to fetch problem ${iden}:`, error)
    throw error
  }
}


// Utility function to get acceptance rate
export async function getAcceptanceRate(accepted: number, total: number): Promise<string> {
  if (total === 0) return "0%"
  return ((accepted / total) * 100).toFixed(1) + "%"
}

// Utility function to format difficulty color
const difficultyColors = {
  "入门": "bg-green-100 text-green-800",
  "简单": "bg-blue-100 text-blue-800",
  "中等": "bg-yellow-100 text-yellow-800",
  "困难": "bg-red-100 text-red-800",
  "极限": "bg-purple-100 text-purple-800"
}

// Utility function to format status color
const statusColors = {
  "published": "bg-green-100 text-green-800",
  "draft": "bg-gray-100 text-gray-800",
  "archived": "bg-red-100 text-red-800"
}

// Utility function to format status label
const statusLabels = {
  "published": "已发布",
  "draft": "草稿",
  "archived": "已归档"
}

// Training interfaces
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

// Training API functions
export async function getAllTrainings(): Promise<TrainingsResponse> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/trainings`)

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
    const response = await fetch(`${API_BASE_URL}/api/training/training/${user_iden}/${training_iden}`)

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to fetch training ${training_iden}:`, error)
    throw error
  }
}

export async function getSidebar(): Promise<any> {

  try {
    const manage = await cookies();
    console.log(manage.toString());
    console.log(666);
    const response = await fetch(`${API_BASE_URL}/api/user/sidebar?path=/`, {
      headers: {
        cookie: manage.toString()
      }
    });
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
    const data = await response.json()
    console.log(data);
    return data
  } catch (error) {
    throw error
  }
}

export async function getRecord(id: string): Promise<any> {
  try {
    const manage = await cookies();
    console.log(manage.toString());
    const response = await fetch(`${API_BASE_URL}/api/record/view/${id}`, {
      headers: {
        cookie: manage.toString()
      }
    });
    
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  } finally {
    console.log("Finished fetching record");
  }
}

export async function listRecords(query: any): Promise<any> {
  try {
    const manage = await cookies();
    const queryString = new URLSearchParams(
      Object.entries(query)
        .filter(([_, v]) => v !== undefined && v !== null)
        .map(([k, v]) => [k, String(v)])
    ).toString();
    
    const response = await fetch(`${API_BASE_URL}/api/record/list?${queryString}`, {
      headers: {
        cookie: manage.toString()
      }
    });
    
    const data = await response.json()
    return data
  } catch (error) {
    throw error
  }
}

export async function getUserInfo(): Promise<any> {
  try {
    const manage = await cookies();
    console.log(manage.toString());
    const response = await fetch(`${API_BASE_URL}/api/user/info`, {
      headers: {
        cookie: manage.toString()
      }
    });
    console.log(123);
    const data = await response.json()
    console.log(data);
    return data
  } catch (error) {
    throw error
  }
}

export async function getTrainingByNodeId(node_id: number): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/training/node/${node_id}`)

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

export async function createTraining(trainingData: {
  title: string
  user_iden: string
  pb_iden: string
  description_public: string
  description_private: string
  start_time: string
  end_time: string
  training_type: string
  problem_list: any
  write_perm_user: number[]
  read_perm_user: number[]
}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/training/training`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
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

// VJudge APIs

export interface VJudgeAccount {
  node_id: number;
  public: {
    platform: string;
    verified: boolean;
    iden: string;
    verified_code: string;
    creation_time: string;
    updated_at: string;
    remote_mode: string;
  };
  private: {
    auth?: {
      Password?: string;
      Token?: string;
    } | null;
  };
}

export interface VJudgeTask {
  node_id: number;
  public: {
    status: string;
    log: string;
    created_at: string;
    updated_at: string;
  };
}

export async function getMyVJudgeAccounts(): Promise<VJudgeAccount[]> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/my_accounts`, {
      headers: {
        cookie: manage.toString()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to fetch vjudge accounts:', error)
    return []
  }
}

export async function bindVJudgeAccount(data: {
  platform: string,
  remote_mode: number,
  auth?: { Password?: string, Token?: string },
  bypass_check?: boolean,
  ws_id?: string
}): Promise<any> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/bind`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: manage.toString()
      },
      body: JSON.stringify(data),
    })

  /*   if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    } */

    return await response.json()
  } catch (error) {
    console.error('Failed to bind vjudge account:', error)
    throw error
  }
}

export async function listVJudgeAccountsByIds(ids: number[]): Promise<VJudgeAccount[]> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/list_by_ids`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: manage.toString()
      },
      body: JSON.stringify({ ids }),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to list vjudge accounts by ids:', error)
    throw error
  }
}

export async function deleteVJudgeAccount(nodeId: number): Promise<any> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/account/${nodeId}`, {
      method: 'DELETE',
      headers: {
        cookie: manage.toString()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to delete vjudge account:', error)
    throw error
  }
}

export async function updateVJudgeAccount(data: {
  node_id: number,
  auth?: { Password?: string, Token?: string }
}): Promise<any> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/account`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        cookie: manage.toString()
      },
      body: JSON.stringify(data),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    return await response.json()
  } catch (error) {
    console.error('Failed to update vjudge account:', error)
    throw error
  }
}

export async function getVJudgeAccountDetail(nodeId: number): Promise<VJudgeAccount> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/account/${nodeId}`, {
      headers: {
        cookie: manage.toString()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.data
  } catch (error) {
    console.error('Failed to get vjudge account detail:', error)
    throw error
  }
}

export async function assignVJudgeTask(data: {
  vjudge_node_id: number,
  range: string,
  ws_id?: string
}): Promise<any> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/assign_task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        cookie: manage.toString()
      },
      body: JSON.stringify(data),
    })

    console.log(response);

    return await response.json()
  } catch (error) {
    console.error('Failed to assign vjudge task:', error)
    throw error
  }
}

export async function listVJudgeTasks(nodeId: number): Promise<VJudgeTask[]> {
  try {
    const manage = await cookies();
    const response = await fetch(`${API_BASE_URL}/api/vjudge/tasks/${nodeId}`, {
      headers: {
        cookie: manage.toString()
      }
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.data || []
  } catch (error) {
    console.error('Failed to list vjudge tasks:', error)
    return []
  }
}
