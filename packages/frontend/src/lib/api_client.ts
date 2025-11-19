

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:1824'

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
    const response = await fetch(`${API_BASE_URL}/api/problem/problem/${iden}`, {
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