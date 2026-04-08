import { Problem, GetProblemEventProp, ProblemAttachDetail } from "@rmjac/api-declare";
import { da } from "zod/v4/locales";
import { Types } from "codeforces-sdk";
import { diff } from "node:util";


const handleCodeforces = async (url: string): Promise<Problem> => {
    const s: Problem = {
        name: "",
        description: {
            content: "",
            description_type: "Html",
        },
        sign: "",
        limit: {
            time_limit: 1000,
            memory_limit: 256,
        },
        platform: "codeforces",
        difficulty: {
            NumberStyle: 0,
        },
    };
}



const handle = async ({ url }: { url: string}): Promise<Problem> => {
    if (url.startsWith("https://")) {
        url = url.slice(8);
    }
    if (url.startsWith("http://")) {
        url = url.slice(7);
    }
    if (url.startsWith("codeforces.com")) {
        return await handleCodeforces(url);
    }
}

const getCodeforcesProblemWithContestID = async (id: number): Promise<[Problem, ProblemAttachDetail][]> => {
    const url = `https://codeforces.com/api/contest.standings?contestId=${id}&from=1&count=5&showUnofficial=true`;
    const data = await fetch(url);
    const raw_json = (await data.json());
    if(raw_json.status !== "OK") {
        return [];
    }
    const json: Types.Problem[] = raw_json.result.problems;
    const res: [Problem, ProblemAttachDetail][] = [];
    for (const problem of json) {
        const new_v: Problem = {
            name: problem.name,
            description: {
                content: "",
                description_type: "Html",
            },
            limit: {
                time_limit: 1000,
                memory_limit: 256,
            },
            platform: "codeforces",
            difficulty: {
                NumberStyle: problem.rating || 0,
            },
            is_remote: true,
            is_sync: true,
            sync_url: `https://codeforces.com//${problem.contestId < 100000 ? "problemset/problem" : "gym"}/${problem.contestId}/${problem.index}`,
            sign: `CF${problem.contestId}${problem.index}`
        };
        const attach_detail: ProblemAttachDetail = {
            sign: `CF${problem.contestId}${problem.index}`,
            iden: [problem.index.toString()],
        }
        res.push([new_v, attach_detail]);
    }
    console.log(res);
    return res;
}


// getCodeforcesProblemWithContestID(566);


const getProblemsEvent = async (event: GetProblemEventProp, callback) => {
    console.log(event);
    if (event.platform === "codeforces") {
        await callback(await getCodeforcesProblemWithContestID(+event.event))
    }
    if (event.platform === "atcoder") {
        await callback(await getAtcoderContestWithContestID(event.event))
    }
}


let nowATData = [];
let nowATDiffCult = {};


const getAtcoderContestWithContestID = async (id: string): Promise<[Problem, ProblemAttachDetail][]> => {
    LOG.info("get atcoder contest");
    if (nowATData.length === 0) {
        const url = 'https://kenkoooo.com/atcoder/resources/problems.json';
        const data = await fetch(url);
        const raw_json = (await data.json());
        nowATData = raw_json;
        const diff_url = 'https://kenkoooo.com/atcoder/resources/problem-models.json';
        const diff_data = await fetch(diff_url);
        const diff_json = (await diff_data.json());
        for (const diff in diff_json) {
            nowATDiffCult[diff] = diff_json[diff].difficulty;
        }
    }
    const res = [];
    for (const problem of nowATData) {
        if (problem.contest_id === id) {
            const new_v: Problem = {
                name: problem.name,
                description: {
                    content: "Fetched from kenkooo.",
                    description_type: "Html",
                },
                limit: {
                    time_limit: -1,
                    memory_limit: -1,
                },
                platform: "atcoder",
                difficulty: {
                    NumberStyle: (nowATDiffCult[problem.id] || 0) <= 0 ? -1 : nowATDiffCult[problem.id],
                },
                is_remote: true,
                is_sync: true,
                sync_url: `https://atcoder.jp/contests/${problem.contest_id}/tasks/${problem.id}`,
                sign: `AT${problem.contest_id}${problem.problem_index}`
            };
            const attach_detail: ProblemAttachDetail = {
                sign: `AT${problem.contestId}${problem.problem_index}`,
                iden: [problem.problem_index.toString()],
            }
            res.push([new_v, attach_detail]);
        }
    }
    return res;
}

export async function apply() {
    socket.on("get_problem", handle)
    socket.on("get_problems_event", getProblemsEvent)
}

