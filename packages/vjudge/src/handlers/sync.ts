import { Problem, SyncListProps, ProblemAttachDetail, SyncBack, RemoteJudgeInfo, Range } from "@rmjac/api-declare";
import {fetchUserSubmissions} from "../utils/codeforcesApi.ts";
import {convertCFSubmissionStatus} from "../../declare/codeforces.ts";

const syncCodeforces = async (handle: string, apiKey: string, apiSecret: string, range: Range): Promise<SyncBack[]> => {
    let from, to;
    if (range.type === "all") {
        from = 1, to = 10000;
    }
    if (range.type === "recent") {
        from = 1, to = range.recent;
    }
    const data = await fetchUserSubmissions(handle, apiKey, apiSecret, from, to);
    LOG.debug(data);
    const res = [];
    for (const judge_data of data) {
        const code = judge_data.sourceBase64 ? atob(judge_data.sourceBase64) : "[archive]";
        const detail: RemoteJudgeInfo[] = [];
        for(let i = 0; i < judge_data.passedTestCount; i ++ ) {
            const detail_data: RemoteJudgeInfo = {
                is_passed: true,
                time: null,
                memory: null,
                score: 1,
                status: "Accepted",
                testcase_name: `testcase #${i + 1}`
            };
            detail.push(detail_data);
        }
        if (judge_data.verdict !== "OK") {
            detail.push({
                is_passed: false,
                time: null,
                memory: null,
                score: 0,
                status: convertCFSubmissionStatus(judge_data.verdict),
                testcase_name: `testcase #${judge_data.passedTestCount + 1}`
            });
        }
        const data: SyncBack = {
            score: judge_data.passedTestCount,
            contest_id: `CF${judge_data.problem.contestId}`,
            iden: `CF${judge_data.problem.contestId}${judge_data.problem.index}`,
            status: convertCFSubmissionStatus(judge_data.verdict),
            passed: judge_data.verdict === "OK",
            time: judge_data.timeConsumedMillis,
            memory: judge_data.memoryConsumedBytes / 1024,
            language: judge_data.programmingLanguage,
            code,
            detail
        }
        res.push(data);
    }
    return res;
}



const syncListEvent = async (event: SyncListProps, callback) => {
    console.log(event);
    if (event.platform === "codeforces") {
        if (event.auth["Apikey"]) {
            const value = event.auth["Apikey"];
            await callback(await syncCodeforces(value.username, value.key, value.secret, event.range))
        }
    }
}

export async function apply() {
    socket.on("sync_list", syncListEvent)
}

