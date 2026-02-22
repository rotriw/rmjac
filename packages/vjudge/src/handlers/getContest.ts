import { ContestType, Problem, Event, Language } from "@rmjac/api-declare";
import { getOnePage } from "../../service/browser.ts";
import { API, Types } from "npm:codeforces-sdk";


const convert = (contest: Types.ContestType): ContestType => {
    if (contest !== "ICPC") {
        return contest;
    }
    return "XCPC";
}

const convert_language = (country: string): Language => {
    if (country === "Russia") {
        return "Russian";
    } else if (country === "China") {
        return "Chinese";
    } else {
        return "English"
    }
}

const handleCodeforces = async (is_gym: boolean): Promise<Event[]> => {
    const c = await fetch(`https://codeforces.com/api/contest.list?gym=${is_gym}`);
    const contest_list: Types.Contest[] = (await c.json()).result;
    const res: Event[] = [];
    for (const contest of contest_list) {
        try {
            const new_v: Event = {
                "name": contest.name,
                "owned_by": {
                    "String": "codeforces"
                },
                "iden_list": [contest.id.toString()],
                "event_type": "OnlineContest",
                "contest_type": convert(contest.type),
                "description": {
                    "content": `${contest.description}\n\n 其他描述: ${contest.country} ${contest.city} ${contest.difficulty} \n\n Sync with Codeforces API.`,
                    "description_type": "Html"
                },
                "event_status": contest.phase === "BEFORE" ? "NotStarted" : (contest.phase === "FINISHED" ? "Ended" : "Ongoing"),
                "language": convert_language(contest.country),
                "event_url": `https://codeforces.com/contest/${contest.id}`,
                "start_time": (contest.startTimeSeconds ? (new Date(contest.startTimeSeconds * 1000)).toISOString() : null),
                "end_time": (contest.startTimeSeconds && contest.durationSeconds ? (new Date((contest.startTimeSeconds + contest.durationSeconds) * 1000)).toISOString() : null),
            };
            res.push(new_v);
        } catch (e) {
            LOG.error(`Error processing contest ${contest.id}: ${e}`);
            continue;
        }
    }
    LOG.info(`Fetched ${res.length} contests from Codeforces.`);
    return res;
}

const handleAtcoderKenkou = async (): Promise<Event[]> => {
    const html = await fetch("https://kenkoooo.com/atcoder/resources/contests.json");
    const json = await html.json();
    const res: Event[] = [];
    for (const contest of json) {
        try {
            const new_v: Event = {
                "name": contest.title,
                "owned_by": {
                    "String": "atcoder"
                },
                "iden_list": [contest.id.toString()],
                "event_type": "OnlineContest",
                "contest_type": "AT",
                "description": {
                    "content": `其他描述: ${contest.start_epoch_second ? contest.start_epoch_second : ""} ${contest.duration_second ? contest.duration_second : ""} \n\n Sync with Atcoder (With Kenkoo API).`,
                    "description_type": "Html"
                },
                "event_status": contest.epoch_second > Math.floor(Date.now() / 1000) ? "NotStarted" : (contest.epoch_second + contest.duration_second < Math.floor(Date.now() / 1000) ? "Ended" : "Ongoing"),
                "language": "English",
                "event_url": `https://atcoder.jp/contests/${contest.id}`,
                "start_time": (contest.start_epoch_second ? (new Date(contest.start_epoch_second * 1000)).toISOString() : null),
                "end_time": (contest.start_epoch_second && contest.duration_second ? (new Date((contest.start_epoch_second + contest.duration_second) * 1000)).toISOString() : null),
            };
            res.push(new_v);
        } catch (e) {
            LOG.error(`Error processing contest ${contest.id}: ${e}`);
            continue;
        }
    }
    LOG.info(`Fetched ${res.length} contests from Atcoder (Kenkou API).`);
    return res;
}


const handle = async ({platform} , callback): Promise<Event[] | undefined> => {
    LOG.info(`Received get_contests request for platform: ${platform}`);
    let res = [];
    try {
        if (platform === "codeforces") {
            res = await handleCodeforces(false);
        } else if (platform === "codeforces_gym") {
            res = await handleCodeforces(true);
        } else if (platform === "atcoder_kenkoo") {
            res = await handleAtcoderKenkou();
        } else {
            LOG.warn(`Platform ${platform} is not supported.`);
        }
    } catch (e) {
        LOG.error(`Error fetching contests for platform ${platform}: ${e}`);
        return undefined;
    }
    callback(res);
}


export async function apply() {
    socket.on("get_contests", handle)
}
