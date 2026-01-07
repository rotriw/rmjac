import { get, post } from "@/lib/http";
import { SubmitReq, LanguageChoiceInformation } from "@rmjac/api-declare";

export type JudgePlatformOptions = LanguageChoiceInformation[];

export async function getSubmitOptions(platform: string): Promise<JudgePlatformOptions> {
  const response = await get<JudgePlatformOptions>(`/api/submit/options/${platform}`);
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to fetch submit options.");
  }
  return response.data!;
}

export async function submitCode(payload: SubmitReq): Promise<{ record_id: number }> {
  const response = await post<SubmitReq, { record_id: number }>(`/api/submit/submit`, payload);
  if (response.code !== 0) {
    throw new Error(response.msg || "Failed to submit code.");
  }
  return response.data!;
}