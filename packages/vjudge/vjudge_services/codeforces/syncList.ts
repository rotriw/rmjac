import { SyncTaskData } from "../../declare/task.ts";
import { fetchUserSubmissions } from "./service/submission.ts";
import { CFSubmissionStatus } from "../../declare/codeforces.ts";
import { UniversalSubmission } from "../../declare/submission.ts";

const convertCFSubmissionStatus = (status: string) =>  {
    return (CFSubmissionStatus as any)[status] || "UnknownError";
}

export const apikey = async (task: SyncTaskData): Promise<{ event: string, data: UniversalSubmission[] }> => {
    const handle = task.vjudge_node.public.iden;
    const auth = task.vjudge_node.private.auth;
    let [from, count] = [0, 20];
    if (task.range === "all") {
        from = 1;
        count = 10000;
    } else if (task.range) {
        const parts = task.range.split(":");
        from = parseInt(parts[0]) || 0;
        count = parseInt(parts[1]) || 20;
    }
    try {
        const token = auth && "Token" in auth ? auth.Token : "";
        const [key, secret] = (token || ":").split(":");
        const submissions = await fetchUserSubmissions(handle, key, secret, from, count);
        const mappedSubmissions = submissions.map(submission => {
            const code = submission.sourceBase64 ? atob(submission.sourceBase64) : "[archive]";
            const status = convertCFSubmissionStatus(submission.verdict || "FAILED");
            let passed: [string, string, number, number, number][] = [];
            if (submission.passedTestCount) {
                passed = Array.from({ length: submission.passedTestCount }, (_, i) => [(i + 1).toString(), "Accepted", 1, -1, -1]);
            }
            if (submission.verdict !== "OK" && submission.passedTestCount !== undefined) {
                passed.push([(submission.passedTestCount + 1).toString(), status, 0, -1, -1]);
            }
            return {
                remote_id: submission.id,
                remote_platform: "codeforces",
                remote_problem_id: `CF${submission.problem.contestId}${submission.problem.index}`,
                language: submission.programmingLanguage,
                code,
                status,
                message: "",
                score: submission.passedTestCount || 0,
                submit_time: new Date(submission.creationTimeSeconds * 1000).toISOString(),
                url: `https://codeforces.com/contest/${submission.problem.contestId}/submission/${submission.id}`,
                passed,
            };
        });
        return {
            event: "sync_done_success",
            data: mappedSubmissions,
        };
    } catch (e) {
        console.error(e);
        return {
            event: "sync_done_failed",
            data: [],
        };
    }
};