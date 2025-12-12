import { Socket } from "npm:socket.io-client@^4.8.1";
import { fetchUserSubmissions as fetchCodeforcesSubmissions } from "../vjudge/codeforces/service/submission.ts";
import { fetchUserSubmissions as fetchAtcoderSubmissions } from "../vjudge/atcoder/service/submission.ts";
import { CFSubmissionStatus } from "../declare/codeforces.ts";

interface SyncUserRemoteSubmissionData {
    vjudge_node: any;
    user_id: string;
    platform: string;
    ws_id: string | null;
    problem_iden: string;    
    fetch_count: "all" | number;
}

const convertCFSubmissionStatus = (status: string) =>  {
    return CFSubmissionStatus[status as keyof typeof CFSubmissionStatus];
}

export const run = async (data: SyncUserRemoteSubmissionData, socket: Socket) => {
    const { vjudge_node, user_id, platform, ws_id, problem_iden, fetch_count } = data;
    if (platform === "codeforces") {
        if (fetch_count === "all") {
            let now_count = 1;
            const result = [];
            // for (let i = 0; i < 20; i ++ ) {
            //     result.push({
            //         remote_id: i,
            //         remote_platform: "codeforces",
            //         remote_problem_id: `CF${(i % 10 + 1)}A`,
            //         language: "test",
            //         code: "#include",
            //         status: "Accepted",
            //         message: "none",
            //         score: 0,
            //         submit_time: new Date(1),
            //         url: `${i % 100 + 1}`,
            //         passed: Array.from({ length: i + 1 }, (_, i) => [(i + 1).toString(), "Accepted", 1, 0, 0]),
            //     });
            // }
            //
            // socket.emit("update_user_submission", {
            //     user_id: parseInt(user_id),
            //     submissions: result
            // });
            // //
            // socket.emit("update_user_submission", {
            //     user_id: parseInt(user_id),
            //     submissions: result
            // });
            // return ;
            while (true) {
                globalThis.LOG.info(`Fetching codeforces submissions from ${now_count} to ${now_count + 999}`);
                const submissions = await fetchCodeforcesSubmissions(
                    vjudge_node.public.iden,
                    vjudge_node.private.auth.split(":")[0],
                    vjudge_node.private.auth.split(":")[1],
                    now_count,
                    1000,
                );
                if (submissions.length === 0) {
                    break;
                }
                now_count += 1000;
                submissions.forEach(submission => {
                    let code = "[archive]";
                    if (submission.sourceBase64) {
                        code = atob(submission.sourceBase64);
                    }
                    const status = convertCFSubmissionStatus(submission.verdict || "FAILED");
                    let passed = Array.from({ length: submission.passedTestCount }, (_, i) => [(i + 1).toString(), "Accepted", 1, 0, 0]);
                    if (submission.verdict !== "OK") {
                        passed.push([(submission.passedTestCount + 1).toString(), status, 0, 0, 0]);
                    }
                    result.push({
                        remote_id: submission.id,
                        remote_platform: "codeforces",
                        remote_problem_id: `CF${submission.problem.contestId}${submission.problem.index}`,
                        language: submission.programmingLanguage,
                        code,
                        status,
                        message: "",
                        score: submission.passedTestCount,
                        submit_time: new Date(submission.creationTimeSeconds * 1000),
                        url: `https://codeforces.com/contest/${submission.problem.contestId}/submission/${submission.id}`,
                        passed,
                    });
                });
                socket.emit("update_user_submission", {
                    user_id: parseInt(user_id),
                    ws_id: ws_id,
                    submissions: result
                });
            }
        }
    }
}