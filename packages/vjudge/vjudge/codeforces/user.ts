import { VerifiedContext } from "@/declare/verified.ts";
import { verifyApiKey } from "./service/verify.ts";
import { checkLoginWithPassword, fetchSubmissionWithId, fetchUserSubmissions, submitProblem } from "./service/submission.ts";
import { UniversalSubmission } from "@/declare/submission.ts";
import { CFSubmissionStatus, convertCFSubmissionStatus } from "@/declare/codeforces.ts";
import { VjudgeAuth } from "../../declare/node.ts";
import { Socket } from "npm:socket.io-client@^4.8.1";


export interface CodeforcesContext extends VerifiedContext {
    auth: string;
}


const verifiedAPIKEY = async (handle: string, auth: string): Promise<boolean> => {
    const [key, secret] = auth.split(":");
    await verifyApiKey(handle, key, secret);
    return true;
}

const verifiedPASSWORD = async (handle: string, auth: VjudgeAuth, socket: Socket): Promise<boolean> => {
    const cookies = await checkLoginWithPassword(handle, auth.password || "");
    if (cookies === false) {
        return false;
    }
    socket?.emit("verified_cookies", {
        platform: "codeforces",
        handle: handle,
        cookies: cookies,
    });
    return true;
}

const syncOneTOKEN = async (handle: string, auth: VjudgeAuth, id: string, contest_id: string): Promise<UniversalSubmission> => {
    const submission = await fetchSubmissionWithId(handle, auth.token || "", id, contest_id);
}

const syncOnePASSWORD = async (handle: string, auth: VjudgeAuth, id: string, contest_id: string): Promise<UniversalSubmission[]> => {
    return await sync_with_id(handle, auth, id, contest_id);
}

const syncListAPIKEY = async (handle: string, auth: VjudgeAuth, from: number, count: number): Promise<UniversalSubmission[]> => {
    try {
        const [key, secret] = (auth.token || ":").split(":");
        const submissions = await fetchUserSubmissions(handle, key, secret, from, count);
        const mappedSubmissions = submissions.map(submission => {
            const code = submission.sourceBase64 ? atob(submission.sourceBase64) : "[archive]";
            const status = convertCFSubmissionStatus(submission.verdict || "FAILED");
            let passed: [string, string, number, number, number][] = [];
            if (submission.passedTestCount) {
                passed = Array.from({ length: submission.passedTestCount }, (_, i) => [(i + 1).toString(), "Accepted", 1, 0, 0]);
            }
            if (submission.verdict !== "OK" && submission.passedTestCount !== undefined) {
                passed.push([(submission.passedTestCount + 1).toString(), status, 0, 0, 0]);
            }
            return {
                remote_id: submission.id.toString(),
                remote_platform: "codeforces",
                remote_problem_id: `${submission.problem.contestId}${submission.problem.index}`,
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
        return mappedSubmissions;
    } catch (e) {
        console.error(e);
        return [];
    }
}

const syncAllAPIKEY = async (handle: string, auth: VjudgeAuth): Promise<UniversalSubmission[]> => {
    const result: UniversalSubmission[] = [];
    try {
        const [key, secret] = (auth.token || ":").split(":");
        let now_count = 1;
        while (true) {
            const submissions = await syncListAPIKEY(handle, auth, now_count, 1000);
            if (submissions.length === 0) {
                break;
            }
            result.push(...submissions);
            now_count += 1000;
        }
    } catch (e) {
        console.error(e);
        return result;
    }
}

const sync_with_id = async (handle: string, auth: VjudgeAuth, id: string, contest_id: string): Promise<UniversalSubmission[]> => {
    // this method only allow PASSWORD | TOKEN.
    // todo.
    const token = await checkLoginWithPassword(handle, auth.password || "");
    if (token === false) {
        return [];
    }
    const submission = await fetchSubmissionWithId(handle, token, id, contest_id);
    return [];
}


interface SubmitResult {
    submission: string;
    token: string;
}

const submitTOKEN = async (handle: string, auth: VjudgeAuth, contest_id: string, problem_id: string, code: string, language: string): Promise<SubmitResult> => {
    const submission = await submitProblem(handle, auth.token || "", contest_id, problem_id, code, language);
    return {
        submission: submission,
        token: auth.token || "",
    };
}

const submitPASSWORD = async (handle: string, auth: VjudgeAuth, contest_id: string, problem_id: string, code: string, language: string): Promise<SubmitResult> => {
    const token = await checkLoginWithPassword(handle, auth.password || "");
    // require go back.
    const submission = await submitProblem(handle, token || "", contest_id, problem_id, code, language);
    return {
        submission: submission,
        token: token || "",
    };
}
export {
    verifiedAPIKEY,
    verifiedPASSWORD,

    // syncOneAPIKEY,
    syncOneTOKEN,
    syncOnePASSWORD,

    syncListAPIKEY,
    syncAllAPIKEY,

    submitPASSWORD,
    submitTOKEN,
}