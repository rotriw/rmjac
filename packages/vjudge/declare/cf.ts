export interface APIContestList {
    status: string
    result: APIContestListResult[]
  }
  
export interface APIContestListResult {
id: number
name: string
type: string
phase: string
frozen: boolean
durationSeconds: number
startTimeSeconds: number
relativeTimeSeconds: number
freezeDurationSeconds?: number
}