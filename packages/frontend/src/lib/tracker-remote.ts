/**
 * 远程平台 API 直接调用工具
 * 前端直接 fetch CF / AT 公开 API，不经过后端
 */

// ==================== Codeforces ====================

interface CFSubmission {
  id: number
  contestId?: number
  creationTimeSeconds: number
  problem: {
    contestId?: number
    index: string
    name: string
    rating?: number
  }
  verdict?: string
  passedTestCount: number
}

interface CFResponse {
  status: string
  result?: CFSubmission[]
  comment?: string
}

/**
 * 从 Codeforces 公开 API 获取用户提交记录
 * 不需要 API key，但有频率限制（约 1 req/2s）
 */
export async function fetchCFUserSubmissions(
  handle: string,
  from = 1,
  count = 10000,
): Promise<CFSubmission[]> {
  const cacheKey = `cf_submissions_${handle}`
  const cached = getFromCache<CFSubmission[]>(cacheKey)
  if (cached) return cached

  const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}&from=${from}&count=${count}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`CF API error: ${res.status}`)
  }
  const data: CFResponse = await res.json()
  if (data.status !== "OK") {
    throw new Error(`CF API error: ${data.comment}`)
  }
  const submissions = data.result ?? []
  setToCache(cacheKey, submissions, 5 * 60 * 1000) // 5 分钟缓存
  return submissions
}

/**
 * 从 CF 提交记录中提取通过状态
 * 返回 Map<problemIden, { passed, bestScore }>
 * problemIden 格式为 "CF{contestId}{index}"（如 "CF1923A"）
 */
export function extractCFSolveStatus(
  submissions: CFSubmission[],
): Map<string, { passed: boolean; score: number }> {
  const result = new Map<string, { passed: boolean; score: number }>()
  for (const sub of submissions) {
    const contestId = sub.contestId ?? sub.problem.contestId
    if (!contestId) continue
    const iden = `cf${contestId}${sub.problem.index}`.toLowerCase()
    const existing = result.get(iden)
    const passed = sub.verdict === "OK"
    const score = passed ? 1 : 0
    if (!existing) {
      result.set(iden, { passed, score })
    } else {
      if (passed) existing.passed = true
      if (score > existing.score) existing.score = score
    }
  }
  return result
}

// ==================== AtCoder (Kenkoooo API) ====================

interface ATSubmission {
  id: number
  epoch_second: number
  problem_id: string
  contest_id: string
  user_id: string
  language: string
  point: number
  length: number
  result: string
  execution_time?: number | null
}

/**
 * 从 Kenkoooo AtCoder API 获取用户提交记录
 */
export async function fetchATUserSubmissions(
  handle: string,
  fromSecond = 0,
): Promise<ATSubmission[]> {
  const cacheKey = `at_submissions_${handle}`
  const cached = getFromCache<ATSubmission[]>(cacheKey)
  if (cached) return cached

  const url = `https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions?user=${encodeURIComponent(handle)}&from_second=${fromSecond}`
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`AtCoder API error: ${res.status}`)
  }
  const data: ATSubmission[] = await res.json()
  setToCache(cacheKey, data, 5 * 60 * 1000) // 5 分钟缓存
  return data
}

/**
 * 从 AT 提交记录中提取通过状态
 * 返回 Map<problemIden, { passed, bestScore }>
 * problemIden 格式为 "atcoder/{contest_id}/{problem_id}" 的小写形式
 */
export function extractATSolveStatus(
  submissions: ATSubmission[],
): Map<string, { passed: boolean; score: number }> {
  const result = new Map<string, { passed: boolean; score: number }>()
  for (const sub of submissions) {
    // AtCoder problem_id 格式如 "abc300_a"，在 rmjac 中 iden 为小写
    const iden = sub.problem_id.toLowerCase()
    const existing = result.get(iden)
    const passed = sub.result === "AC"
    const score = sub.point
    if (!existing) {
      result.set(iden, { passed, score })
    } else {
      if (passed) existing.passed = true
      if (score > existing.score) existing.score = score
    }
  }
  return result
}

// ==================== localStorage 缓存 ====================

function getFromCache<T>(key: string): T | null {
  if (typeof window === "undefined") return null
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const { data, expiry } = JSON.parse(raw)
    if (Date.now() > expiry) {
      localStorage.removeItem(key)
      return null
    }
    return data as T
  } catch {
    return null
  }
}

function setToCache<T>(key: string, data: T, ttlMs: number): void {
  if (typeof window === "undefined") return
  try {
    localStorage.setItem(key, JSON.stringify({ data, expiry: Date.now() + ttlMs }))
  } catch {
    // localStorage 满了或不可用，忽略
  }
}
