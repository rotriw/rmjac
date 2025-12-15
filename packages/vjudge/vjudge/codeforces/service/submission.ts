import { z } from "npm:zod";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";

const submissionSchema = z.object({
  id: z.number(),
  contestId: z.number().optional(),
  creationTimeSeconds: z.number(),
  relativeTimeSeconds: z.number(),
  problem: z.object({
    contestId: z.number().optional(),
    index: z.string(),
    name: z.string(),
    type: z.string(),
    points: z.number().optional(),
    rating: z.number().optional(),
    tags: z.array(z.string()),
  }),
  author: z.object({
    contestId: z.number().optional(),
    members: z.array(z.object({ handle: z.string() })),
    participantType: z.string(),
    ghost: z.boolean().optional(),
    room: z.number().optional(),
    startTimeSeconds: z.number().optional(),
  }),
  programmingLanguage: z.string(),
  verdict: z.string().optional(),
  testset: z.string(),
  passedTestCount: z.number(),
  timeConsumedMillis: z.number(),
  memoryConsumedBytes: z.number(),
  sourceBase64: z.string().optional(),
});

const responseSchema = z.object({
  status: z.string(),
  result: z.array(submissionSchema).optional(),
  comment: z.string().optional(),
});

async function createApiSig(methodName: string, params: Record<string, any>, apiSecret: string): Promise<string> {
  const paramString = Object.entries(params)
    .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
    .map(([key, value]) => `${key}=${value}`)
    .join("&");

  const rand = "123456";
  const hashString = `${rand}/${methodName}?${paramString}#${apiSecret}`;
  
  const encoder = new TextEncoder();
  const data = encoder.encode(hashString);
  const hashBuffer = await crypto.subtle.digest("SHA-512", data);
  
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return `${rand}${hashHex}`;
}

export async function fetchUserSubmissions(
  handle: string,
  apiKey: string,
  apiSecret: string,
  from = 1,
  count = 100,
) {
  const methodName = "user.status";
  const params = { handle, from, count, apiKey, time: Math.floor(Date.now() / 1000), includeSources: true };
  const apiSig = await createApiSig(methodName, params, apiSecret);

  const url = new URL("https://codeforces.com/api/user.status");
  Object.entries({ ...params, apiSig }).forEach(([key, value]) => {
    url.searchParams.append(key, String(value));
  });

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    const validatedData = responseSchema.parse(data);

    if (validatedData.status !== "OK") {
      throw new Error(`Codeforces API Error: ${validatedData.comment}`);
    }
    return validatedData.result ?? [];
  } catch (error) {
    console.error(`Error fetching submissions for handle ${handle}:`, error);
    throw error;
  }
}