import { z } from "npm:zod";

const submissionSchema = z.object({
  id: z.number(),
  epoch_second: z.number(),
  problem_id: z.string(),
  contest_id: z.string(),
  user_id: z.string(),
  language: z.string(),
  point: z.number(),
  length: z.number(),
  result: z.string(),
  execution_time: z.number().nullable().optional(),
});

type Submission = z.infer<typeof submissionSchema>;

const API_URL = "https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions";

/**
 * Fetches submissions for a given user from the AtCoder Problems API.
 * @param userHandle The AtCoder user handle.
 * @param fromSecond The Unix timestamp to fetch submissions from. Defaults to 0.
 * @returns A promise that resolves to an array of submissions.
 */
export async function fetchUserSubmissions(
  userHandle: string,
  fromSecond = 0,
): Promise<Submission[]> {
  const url = `${API_URL}?user=${userHandle}&from_second=${fromSecond}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();

    // The API returns a simple array of submissions, so we parse it directly.
    const validatedData = z.array(submissionSchema).parse(data);
    return validatedData;
  } catch (error) {
    console.error(
      `Error fetching submissions for AtCoder user ${userHandle}:`,
      error,
    );
    throw error;
  }
}

export async function syncSpecificContestStatus(contestId: string) {
  const url = `https://atcoder.jp/contests/${contestId}/submissions/status/json`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
    return data;
  } catch (error) {
    console.error(
      `Error fetching submission status for contest ${contestId}:`,
      error,
    );
    throw error;
  }
}

