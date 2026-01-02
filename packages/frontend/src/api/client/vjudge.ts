import { API_BASE_URL } from './config'

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

export async function getMyVJudgeAccounts(): Promise<VJudgeAccount[]> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vjudge/my_accounts`, {
        credentials: 'include',
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

export async function assignVJudgeTask(data: {
  vjudge_node_id: number,
  range: string,
  ws_id?: string
}): Promise<any> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/vjudge/assign_task`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
      credentials: 'include',
    })

    return await response.json()
  } catch (error) {
    console.error('Failed to assign vjudge task:', error)
    throw error
  }
}