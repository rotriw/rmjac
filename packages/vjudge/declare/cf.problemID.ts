export interface Root {
    status: string
    result: Result
  }
  
  export interface Result {
    contest: Contest
    problems: Problem[]
    rows: Row[]
  }
  
  export interface Contest {
    id: number
    name: string
    type: string
    phase: string
    frozen: boolean
    durationSeconds: number
    startTimeSeconds: number
    relativeTimeSeconds: number
  }
  
  export interface Problem {
    contestId: number
    index: string
    name: string
    type: string
    points: number
    rating: number
    tags: string[]
  }
  
  export interface Row {
    party: Party
    rank: number
    points: number
    penalty: number
    successfulHackCount: number
    unsuccessfulHackCount: number
    problemResults: ProblemResult[]
  }
  
  export interface Party {
    contestId: number
    participantId: number
    members: Member[]
    participantType: string
    ghost: boolean
    room: number
    startTimeSeconds: number
  }
  
  export interface Member {
    handle: string
  }
  
  export interface ProblemResult {
    points: number
    rejectedAttemptCount: number
    type: string
    bestSubmissionTimeSeconds?: number
  }
  