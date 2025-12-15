import { VerifiedContext } from "@/declare/verified.ts";
import { getOnePage } from "@/service/browser.ts";
import { verifyApiKey } from "./service/verify.ts";
import { fetchUserSubmissions } from "./service/submission.ts";
import { UniversalSubmission } from "@/declare/submission.ts";
import { CFSubmissionStatus } from "@/declare/codeforces.ts";
import { VjudgeAuth } from "../../declare/node.ts";


export interface CodeforcesContext extends VerifiedContext {
    auth: string;
}


const convertCFSubmissionStatus = (status: string) =>  {
    return CFSubmissionStatus[status as keyof typeof CFSubmissionStatus] || "UnknownError";
}

const verified_with_password = async (handle: string, password: string): Promise<boolean> => {
    try {
        const browser = await getOnePage();
        const page = await browser.newPage();
        console.log(page);
        await page.goto("https://codeforces.com/enter");
        const res = await page.clickAndWaitForNavigation("body");
        console.log(res);
        await new Promise(resolve => setTimeout(resolve, 3000));
        await page.type("input[name='handleOrEmail']", handle);
        await page.type("input[name='password']", password);
        await page.click("input[type='submit']");
        await page.waitForNavigation(); 
        await new Promise(resolve => setTimeout(resolve, 1000));
        try {
            if (await page.url().includes(handle)) {
                return true;
            } else {
                return false;
            }
        } catch (e) {
            console.error(e);
            return false;
        }
    } catch (e) {
        console.error(e);
        return false;
    }
}

const verifiedAPIKEY = async (handle: string, auth: string): Promise<boolean> => {
    const [key, secret] = auth.split(":");
    await verifyApiKey(handle, key, secret);
    return true;
}

const verifiedPASSWORD = async (handle: string, auth: VjudgeAuth): Promise<boolean> => {
    return await verified_with_password(handle, auth.password || "");
}

const syncOneTOKEN = async (handle: string, auth: string, id: string): Promise<UniversalSubmission> => {
    return await sync_with_id(handle, auth, id);
}

const syncOneAPIKEY = async (handle: string, auth: string, id: string, contest_id: string): Promise<UniversalSubmission[]> => {


}

const syncOnePASSWORD = async (handle: string, auth: string, id: string): Promise<UniversalSubmission[]> => {
    return await sync_with_id(handle, auth, id);
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

const sync_with_id = async (handle: string, context: CodeforcesContext, id: string): Promise<UniversalSubmission[]> => {
    // this method only allow PASSWORD | TOKEN.
    // todo.

    return [];
}

export {
    verifiedAPIKEY,
    verifiedPASSWORD,

    syncOneAPIKEY,
    syncOneTOKEN,
    syncOnePASSWORD,

    syncListAPIKEY,
    syncAllAPIKEY,
}