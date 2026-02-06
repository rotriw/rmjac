/**
 * 外部平台数据提供者
 * 这个模块定义了从外部 OJ 平台获取用户提交数据的抽象接口
 * 支持扩展到不同的平台（Codeforces, AtCoder 等）
 */

// 通过题目的基本信息
export interface SolvedProblem {
  problemId: string      // 题目标识符，格式由各平台定义
  problemName?: string   // 题目名称（可选）
  solvedAt?: number      // 通过时间戳（可选）
}

// 外部用户信息
export interface ExternalUser {
  handle: string         // 用户名/句柄
  platform: string       // 平台名称
  displayName?: string   // 显示名称
  solvedProblems: Set<string>  // 已通过题目的集合
}

// 缓存的用户数据
interface CachedExternalUser {
  handle: string
  platform: string
  displayName?: string
  solvedProblems: string[]  // 使用数组以便序列化
  cachedAt: number  // 缓存时间戳
}

// 缓存配置
const CACHE_KEY_PREFIX = "external_user_cache_"
const CACHE_TTL = 24 * 60 * 60 * 1000  // 24小时缓存有效期

// 平台提供者接口
export interface PlatformProvider {
  platformName: string
  platformCode: string
  // 获取用户通过的题目列表
  fetchUserSolved(handle: string): Promise<ExternalUser>
  // 将平台的题目ID转换为本系统的题目标识符（如果可能）
  normalizeProblemId?(problemId: string): string
}

/**
 * 缓存管理器
 */
class CacheManager {
  private getCacheKey(platform: string, handle: string): string {
    return `${CACHE_KEY_PREFIX}${platform}_${handle.toLowerCase()}`
  }

  /**
   * 从缓存获取用户数据
   */
  get(platform: string, handle: string): ExternalUser | null {
    if (typeof window === "undefined") return null
    
    try {
      const key = this.getCacheKey(platform, handle)
      const cached = localStorage.getItem(key)
      
      if (!cached) return null
      
      const data: CachedExternalUser = JSON.parse(cached)
      
      // 检查缓存是否过期
      if (Date.now() - data.cachedAt > CACHE_TTL) {
        localStorage.removeItem(key)
        return null
      }
      
      return {
        handle: data.handle,
        platform: data.platform,
        displayName: data.displayName,
        solvedProblems: new Set(data.solvedProblems)
      }
    } catch (error) {
      console.error("Failed to read from cache:", error)
      return null
    }
  }

  /**
   * 将用户数据存入缓存
   */
  set(user: ExternalUser): void {
    if (typeof window === "undefined") return
    
    try {
      const key = this.getCacheKey(user.platform, user.handle)
      const data: CachedExternalUser = {
        handle: user.handle,
        platform: user.platform,
        displayName: user.displayName,
        solvedProblems: Array.from(user.solvedProblems),
        cachedAt: Date.now()
      }
      
      localStorage.setItem(key, JSON.stringify(data))
    } catch (error) {
      console.error("Failed to write to cache:", error)
    }
  }

  /**
   * 清除指定用户的缓存
   */
  clear(platform: string, handle: string): void {
    if (typeof window === "undefined") return
    
    try {
      const key = this.getCacheKey(platform, handle)
      localStorage.removeItem(key)
    } catch (error) {
      console.error("Failed to clear cache:", error)
    }
  }

  /**
   * 清除所有外部用户缓存
   */
  clearAll(): void {
    if (typeof window === "undefined") return
    
    try {
      const keysToRemove: string[] = []
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i)
        if (key && key.startsWith(CACHE_KEY_PREFIX)) {
          keysToRemove.push(key)
        }
      }
      keysToRemove.forEach(key => localStorage.removeItem(key))
    } catch (error) {
      console.error("Failed to clear all cache:", error)
    }
  }

  /**
   * 获取缓存信息（用于调试/显示）
   */
  getCacheInfo(platform: string, handle: string): { isCached: boolean, cachedAt?: Date, expiresAt?: Date } | null {
    if (typeof window === "undefined") return null
    
    try {
      const key = this.getCacheKey(platform, handle)
      const cached = localStorage.getItem(key)
      
      if (!cached) return { isCached: false }
      
      const data: CachedExternalUser = JSON.parse(cached)
      const cachedAt = new Date(data.cachedAt)
      const expiresAt = new Date(data.cachedAt + CACHE_TTL)
      
      return {
        isCached: true,
        cachedAt,
        expiresAt
      }
    } catch {
      return null
    }
  }
}

// 全局缓存管理器实例
const cacheManager = new CacheManager()

// Codeforces API 响应类型
interface CFSubmission {
  id: number
  contestId?: number
  creationTimeSeconds: number
  problem: {
    contestId?: number
    index: string
    name: string
  }
  author: {
    members: Array<{ handle: string }>
  }
  programmingLanguage: string
  verdict?: string
}

interface CFApiResponse {
  status: string
  result?: CFSubmission[]
  comment?: string
}

/**
 * Codeforces 平台提供者
 */
export class CodeforcesProvider implements PlatformProvider {
  platformName = "Codeforces"
  platformCode = "cf"

  async fetchUserSolved(handle: string, forceRefresh = false): Promise<ExternalUser> {
    // 先检查缓存
    if (!forceRefresh) {
      const cached = cacheManager.get(this.platformCode, handle)
      if (cached) {
        console.log(`[Codeforces] Using cached data for ${handle}`)
        return cached
      }
    }

    console.log(`[Codeforces] Fetching data for ${handle} from API...`)
    const url = `https://codeforces.com/api/user.status?handle=${encodeURIComponent(handle)}`
    
    try {
      const response = await fetch(url)
      const data: CFApiResponse = await response.json()
      
      if (data.status !== "OK" || !data.result) {
        throw new Error(data.comment || "Failed to fetch Codeforces data")
      }

      const solvedProblems = new Set<string>()
      
      // 遍历所有提交，找出 AC 的题目
      for (const submission of data.result) {
        if (submission.verdict === "OK" && submission.problem.contestId) {
          // Codeforces 题目ID格式: contestId + 题目字母索引
          // 例如: "1A" 表示比赛1的A题
          const problemId = `${submission.problem.contestId}${submission.problem.index}`
          solvedProblems.add(problemId)
        }
      }

      const user: ExternalUser = {
        handle,
        platform: this.platformCode,
        displayName: handle,
        solvedProblems
      }

      // 存入缓存
      cacheManager.set(user)
      console.log(`[Codeforces] Cached ${solvedProblems.size} solved problems for ${handle}`)

      return user
    } catch (error) {
      console.error("Codeforces API error:", error)
      throw error
    }
  }

  normalizeProblemId(problemId: string): string {
    // Codeforces 题目ID通常格式为 "1234A" 或 "1234/A"
    // 标准化为 "cf1234A" 格式
    return `cf${problemId.replace("/", "")}`
  }
}

// AtCoder 平台提供者预留接口 - 待实现
// export class AtCoderProvider implements PlatformProvider {
//   platformName = "AtCoder"
//   platformCode = "atc"
//   async fetchUserSolved(handle: string): Promise<ExternalUser> {
//     // https://kenkoooo.com/atcoder/atcoder-api/v3/user/ac_rank?user={handle}
//     throw new Error("AtCoder provider not yet implemented")
//   }
//   normalizeProblemId(problemId: string): string {
//     return `atc${problemId}`
//   }
// }

// 平台提供者注册表
const providers: Map<string, PlatformProvider> = new Map([
  ["cf", new CodeforcesProvider()],
  ["codeforces", new CodeforcesProvider()],
  // ["atc", new AtCoderProvider()],
  // ["atcoder", new AtCoderProvider()],
])

/**
 * 获取平台提供者
 */
export function getProvider(platform: string): PlatformProvider | undefined {
  return providers.get(platform.toLowerCase())
}

/**
 * 获取所有可用的平台
 */
export function getAvailablePlatforms(): Array<{ code: string, name: string }> {
  const seen = new Set<string>()
  const result: Array<{ code: string, name: string }> = []
  
  providers.forEach((provider) => {
    if (!seen.has(provider.platformCode)) {
      seen.add(provider.platformCode)
      result.push({
        code: provider.platformCode,
        name: provider.platformName
      })
    }
  })
  
  return result
}

/**
 * 获取用户缓存信息
 */
export function getUserCacheInfo(platform: string, handle: string) {
  return cacheManager.getCacheInfo(platform, handle)
}

/**
 * 清除用户缓存（强制刷新时使用）
 */
export function clearUserCache(platform: string, handle: string): void {
  cacheManager.clear(platform, handle)
}

/**
 * 清除所有外部用户缓存
 */
export function clearAllExternalUserCache(): void {
  cacheManager.clearAll()
}
