import { API_BASE_URL } from './config'

export interface SubmitOption {
  iden: string
  name: string
  description: string
  option_type: 'Select' | 'Boolean' | 'Text'
  select_options?: Array<{
    iden: string
    name: string
  }>
}

export interface LanguageChoiceOptionsInformation {
  name: string
  is_compile: boolean
  is_input: boolean
  allowed_option: string[]
}

export interface LanguageChoiceInformation {
  name: string
  allow_option: LanguageChoiceOptionsInformation[]
}

export type JudgePlatformOptions = LanguageChoiceInformation[]

export async function getSubmitOptions(platform: string): Promise<JudgePlatformOptions> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/submit/options/${platform}`, {
      credentials: 'include',
    })

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data.data as JudgePlatformOptions
  } catch (error) {
    console.error(`Failed to fetch submit options for platform ${platform}:`, error)
    throw error
  }
}

export interface SubmitPayload {
  statement_id: number
  vjudge_id: number
  code: string
  language: string
  judge_option: Record<string, string>
  public_view: boolean
}

export async function submitCode(payload: SubmitPayload): Promise<{ record_id: number }> {
  try {
    const response = await fetch(`${API_BASE_URL}/api/submit/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      credentials: 'include',
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.message || `HTTP error! status: ${response.status}`)
    }

    const data = await response.json()
    return data
  } catch (error) {
    console.error('Failed to submit code:', error)
    throw error
  }
}