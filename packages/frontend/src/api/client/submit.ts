import { get, post } from "@/lib/http";
import { SubmitReq, LanguageChoiceInformation, RecordNode } from "@rmjac/api-declare";

// Re-export type for convenience
export type JudgePlatformOptions = LanguageChoiceInformation[];

/**
 * 获取平台提交选项
 * GET /api/submit/options/{platform}
 */
export async function getSubmitOptions(platform: string): Promise<JudgePlatformOptions> {
  const response = await get<JudgePlatformOptions>(`/api/submit/options/${platform}`);
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to fetch submit options.");
  }
  return response.data!;
}

/**
 * 提交代码
 * POST /api/submit/submit
 */
export async function submitCode(payload: SubmitReq): Promise<RecordNode> {
  const response = await post<SubmitReq, RecordNode>(`/api/submit/submit`, payload);
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to submit code.");
  }
  return response.data!;
}