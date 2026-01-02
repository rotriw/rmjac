import { API_BASE_URL } from './config'

export async function createProblem(problemData: {
  problem_iden: string
  problem_name: string
  problem_statement: Array<{
    statement_source: string
    problem_iden?: string
    problem_statements: any[]
    time_limit: number
    memory_limit: number
  }>
  creation_time?: string
  tags: string[]
}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/create`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(problemData),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to create problem:', error)
    throw error
  }
}

export async function deleteProblem(iden: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/problem/view/${iden}`, {
      method: 'DELETE',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }
  } catch (error) {
    console.error(`Failed to delete problem ${iden}:`, error)
    throw error
  }
}

export async function getProblemForEdit(iden: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/view/${iden}`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to fetch problem ${iden} for editing:`, error)
    throw error
  }
}

export async function updateProblemStatement(iden: string, content: Array<{
  iden: string
  content: string
}>): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/manage/${iden}/update_statement_content`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(content),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to update problem statement ${iden}:`, error)
    throw error
  }
}

export async function updateProblemSource(iden: string, source: string): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/problem/manage/${iden}/update_statement_source`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(source),
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error(`Failed to update problem source ${iden}:`, error)
    throw error
  }
}