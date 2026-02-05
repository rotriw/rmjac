import { UniversalSubmission } from "../../declare/submission.ts";
import { HTTPResponse } from "npm:rebrowser-puppeteer-core";
import { convertCFSubmissionStatus } from "../../declare/codeforces.ts";
import { VjudgeNode } from "../../declare/node.ts";
import { JSDOM } from "jsdom";
import { getOnePage } from "../../service/browser.ts";


async function fetchSubmissionWithId(
    handle: string,
    token: string,
    url: string,
    contest_id: string,
    id: string,
): Promise<UniversalSubmission> {
    const browser = await getOnePage(handle);
    const page = await browser.newPage();
    browser.setCookie({
        name: "JSESSIONID",
        value: token,
        domain: "codeforces.com",
        path: "/",
        expires: -1,
        secure: false,
        httpOnly: true,
        sameSite: "Lax",
        size: token.length,
        priority: "Medium",
        sourceScheme: "Secure",
        sameParty: false,
        session: true,
    });
    await page.goto(url, { waitUntil: "domcontentloaded" });
    const nl = await page.reload() as unknown as HTTPResponse;
    // console.log(await page.content());
    const content = await nl.text();
    const dom = new JSDOM(content);
    const $ = dom.window.document;
    let problem_id = "";
    $.querySelectorAll("a")?.forEach(a => {
        if (a.href.includes(`/contest/${contest_id}/problem/`)) {
            problem_id = a.textContent || "";
        } else if (a.href.includes(`/gym/${contest_id}/problem/`)) {
            problem_id = a.textContent || "";
        }
    });
    let language = "";
    let status = "";
    let date_time = "";
    const trs = $.querySelectorAll("tr");
    for (const tr of trs) {
        const td = tr.querySelectorAll("td");
        console.log(td);
        let if_find = false;
        if (td.length > 0) {
            const td0 = td[0];
            if (td0.textContent?.includes(id)) {
                if_find = true;
            }
        }
        if (!if_find) {
            continue;
        }
        language = td[3].textContent.trim().replaceAll('    ', '').replaceAll('\n', '') || "";
        status = td[4].textContent || "";
        date_time = new Date(td[7].textContent).toISOString();
        break;
    }
    const csrf_token = await page.evaluate(() => {
        return document.querySelector("meta[name='csrf-token']")?.getAttribute("content") || "";
    });
    const [response] = await Promise.all([
        page.waitForResponse(response => response.url().includes("submitSource")),
        page.evaluate(async (id) => {
            //@ts-ignore 网页端有jquery。
            const res = await $.post("/data/submitSource", { submissionId: id, csrf_token: document.querySelector("meta[name='X-Csrf-Token']")?.getAttribute("content") || ""})
            return res;
        }, id)
    ]);
    const data = await response.json();
    const code = data.source;
    const count = +data.testCount;
    const passed: [string, string, number, number, number][] = [];
    for (let i = 1; i <= count; i ++ ) {
        const status = convertCFSubmissionStatus(data[`verdict#${i}`]);
        const time = +data[`timeConsumed#${i}`];
        const memory = +data[`memoryConsumed#${i}`];
        passed.push([`${i}`, status, (status === "Accepted" ? 1 : 0), time, memory]);
    }
    if (data[`timeConsumed#${count + 1}`]) {
        const status = convertCFSubmissionStatus(data[`verdict#${count + 1}`]);
        const time = +data[`timeConsumed#${count + 1}`];
        const memory = +data[`memoryConsumed#${count + 1}`];
        passed.push([`${count + 1}`, status, (status === "Accepted" ? 1 : 0), time, memory]);
    }
    if (status === "OK") {
        status = "Accepted";
    } else {
        status = convertCFSubmissionStatus(data[`verdict#${count + 1}`]);
    }
    const result: UniversalSubmission = {
        remote_id: +id,
        remote_platform: "codeforces",
        remote_problem_id: `CF${problem_id}`,
        language,
        code,
        status,
        message: "",
        score: 0,
        submit_time: date_time,
        url: `https://codeforces.com/contest/${contest_id}/submission/${id}`,
        passed,
    };
    return result;
}

export const token = async (task: {
    vjudge_node: VjudgeNode,
    info: string,
    url: string
}): Promise<any | null> => {
    const handle = task.vjudge_node.public.iden;
    const auth = task.vjudge_node.private.auth;
    if (task?.url) {
        const url = task.url;
        const url_obj = new URL(url);
        const paths = url_obj.pathname.split("/");
        const contest_id = paths[2];
        const id = paths[paths.length - 1];
        const result = await fetchSubmissionWithId(handle, auth.Token || "", url, contest_id, id);
        return {
            event: "sync_done_success",
            data: [result],
        };
    }
    return null;
}