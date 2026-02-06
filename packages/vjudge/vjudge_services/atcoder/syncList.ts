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

const API_URL = "https://kenkoooo.com/atcoder/atcoder-api/v3/user/submissions";

export async function fetchUserSubmissions(
  userHandle: string,
  fromSecond = 0,
) {
  const url = `${API_URL}?user=${userHandle}&from_second=${fromSecond}`;

  try {
    const res = await fetch(url);
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status} ${await res.text()}`);
    }
    const data = await res.json();
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

export const password = async (task: any) => {
    const { handle } = task;
    const submissions = await fetchUserSubmissions(handle);
    return submissions.map(s => ({
        remote_id: String(s.id),
        status: s.result,
    }));
}

export const token = async (task: any) => password(task);

export const only = async (task: any) => password(task);