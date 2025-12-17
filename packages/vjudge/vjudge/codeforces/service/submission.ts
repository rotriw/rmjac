import { z } from "npm:zod";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { getOnePage } from "@/service/browser.ts";
import * as cookie from "cookie";
import { Cookie } from "npm:puppeteer-core";
import { UniversalSubmission } from "../../../declare/submission.ts";
import { JSDOM } from "jsdom";
import { HTTPResponse } from "npm:puppeteer-core";
import { convertCFSubmissionStatus } from "../../../declare/codeforces.ts";
import { get_loc } from "../../../utils/cf_click.ts";
import { CALIB_THIN_PRISM_MODEL } from "@techstark/opencv-js";

const submissionSchema = z.object({
    id: z.number(),
    contestId: z.number().optional(),
    creationTimeSeconds: z.number(),
    relativeTimeSeconds: z.number(),
    problem: z.object({
        contestId: z.number().optional(),
        index: z.string(),
        name: z.string(),
        type: z.string(),
        points: z.number().optional(),
        rating: z.number().optional(),
        tags: z.array(z.string()),
    }),
    author: z.object({
        contestId: z.number().optional(),
        members: z.array(z.object({ handle: z.string() })),
        participantType: z.string(),
        ghost: z.boolean().optional(),
        room: z.number().optional(),
        startTimeSeconds: z.number().optional(),
    }),
    programmingLanguage: z.string(),
    verdict: z.string().optional(),
    testset: z.string(),
    passedTestCount: z.number(),
    timeConsumedMillis: z.number(),
    memoryConsumedBytes: z.number(),
    sourceBase64: z.string().optional(),
});

const responseSchema = z.object({
    status: z.string(),
    result: z.array(submissionSchema).optional(),
    comment: z.string().optional(),
});

async function createApiSig(methodName: string, params: Record<string, any>, apiSecret: string): Promise<string> {
    const paramString = Object.entries(params)
        .sort(([keyA], [keyB]) => keyA.localeCompare(keyB))
        .map(([key, value]) => `${key}=${value}`)
        .join("&");

    const rand = "123456";
    const hashString = `${rand}/${methodName}?${paramString}#${apiSecret}`;
    const encoder = new TextEncoder();
    const data = encoder.encode(hashString);
    const hashBuffer = await crypto.subtle.digest("SHA-512", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return `${rand}${hashHex}`;
}

export async function fetchUserSubmissions(
    handle: string,
    apiKey: string,
    apiSecret: string,
    from = 1,
    count = 100,
) {
    const methodName = "user.status";
    const params = { handle, from, count, apiKey, time: Math.floor(Date.now() / 1000), includeSources: true };
    const apiSig = await createApiSig(methodName, params, apiSecret);

    const url = new URL("https://codeforces.com/api/user.status");
    Object.entries({ ...params, apiSig }).forEach(([key, value]) => {
        url.searchParams.append(key, String(value));
    });

    try {
        const res = await fetch(url);
        if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status} ${await res.text()}`);
        }
        const data = await res.json();
        const validatedData = responseSchema.parse(data);

        if (validatedData.status !== "OK") {
        throw new Error(`Codeforces API Error: ${validatedData.comment}`);
        }
        return validatedData.result ?? [];
    } catch (error) {
        console.error(`Error fetching submissions for handle ${handle}:`, error);
        throw error;
    }
}

export async function loginWithPassword(
    handle: string,
    password: string,
): Promise<string | ""> {
    const browser = await getOnePage();
    const page = await browser.newPage();
    console.log(page);
    await page.goto("https://codeforces.com/enter");
    // deno-lint-ignore ban-ts-comment
    //@ts-ignore
    await page.clickAndWaitForNavigation("body");
    await new Promise(resolve => setTimeout(resolve, 3000));
    await page.type("input[name='handleOrEmail']", handle);
    await page.type("input[name='password']", password);
    await page.click("input[type='submit']");

    await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    // await new Promise(resolve => setTimeout(resolve, 3000));
    // if (!(await page.content()).includes(handle)) {
    //     return "";

    // }
    console.log(await browser.cookies());
    const cookies = await browser.cookies();
    for (const cookie of cookies) {
        if (cookie.name === "JSESSIONID") {
            return cookie.value;
        }
    }
    return "";
}

export async function checkLoginWithPassword(
    handle: string,
    password: string,
): Promise<false | string> {
    try {
        const cookies = await loginWithPassword(handle, password);
        if (cookies === "") {
            return false;
        }
        return cookies;
    } catch (e) {
        LOG.info(`Error checking login with password: ${e}`);
        return false;
    }
}

export async function fetchSubmissionWithId(
    handle: string,
    token: string,
    id: string,
    contest_id: string,
): Promise<UniversalSubmission> {
    const browser = await getOnePage();
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
        sourcePort: 443,
        sourceScheme: "Secure",
        sameParty: false,
    });
    const type = (+contest_id < 10000) ? "contest" : "gym";
    await page.goto(`https://codeforces.com/${type}/${contest_id}/submission/${id}`, { waitUntil: "domcontentloaded" });
    const nl = await page.reload() as unknown as HTTPResponse;
    // console.log(await page.content());
    const content = await nl.text();
    const dom = new JSDOM(content);
    const $ = dom.window.document;
    let problem_id = "";
    $.querySelectorAll("a")?.forEach(a => {
        if (a.href.includes(`/contest/${contest_id}/problem/`)) {
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
        console.log(td[3].innerHTML, td[4].innerHTML);
        console.log(td[3].textContent, td[4].textContent);
        language = td[3].textContent.trim().replaceAll('    ', '').replaceAll('\n', '') || "";
        status = td[4].textContent || "";
        date_time = new Date(td[7].textContent).toISOString();
        break;
    }
    
    // convert status.
    const [response] = await Promise.all([
        page.waitForResponse(response => response.url().includes("submitSource")),
        page.evaluate(async () => {
            const res = await $.post("/data/submitSource", { submissionId: "353181729", csrf_token: "d75e4c8ea6aa6164cbfae852a1767d99"})
            return res;
        })
    ]);
    console.log(response);
    const data = await response.json();
    const code = data.source;
    const count = +data.testCount;
    const passed: [string, string, number, number, number][] = [];
    for (let i = 1; i <= count; i ++ ) {
        const status = convertCFSubmissionStatus(data[`verdict#${i}`]);
        const time = +data[`timeConsumed#${i}`];
        const memory = +data[`memoryConsumed#${i}`];
        passed.push([`${i}`, status, time, memory, 0]);
    }
    if (status === "OK") {
        status = "Accepted";
    } else {
        status = "Wrong Answer";
    }
    const result: UniversalSubmission = {
        remote_id: id,
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
    console.log(result);
    return result;
}

export async function submitProblem(
    handle: string,
    token: string,
    contest_id: string,
    problem_id: string,
    code: string,
    language: string,
): Promise<string> {
    const browser = await getOnePage();
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
        sourcePort: 443,
        sourceScheme: "Secure",
        sameParty: false,
    });
    await page.goto(`https://codeforces.com/contest/${contest_id}/submit`, { waitUntil: "domcontentloaded" });
    await page.setViewport({
        width: 2000,
        height: 1000,
        deviceScaleFactor: 2,
    });
    for (let i = 0; i < 10; i ++ ) {
        await page.keyboard.press('PageDown');
    }
    await new Promise(resolve => setTimeout(resolve, 4000));
    const image = await page.screenshot({
        type: "jpeg",
        quality: 100,
    });
    const pos = await get_loc(image);
    await new Promise(resolve => setTimeout(resolve, 100));
    await page.mouse.click(pos.x / 2 + 50, pos.y / 2 + 50, {
        button: "left",
        clickCount: 2,
    });
    // choose language.
    // choose problem.
    const problem_select = await page.waitForSelector("select[name='submittedProblemIndex']");
    await problem_select.select(problem_id);
    const language_select = await page.waitForSelector("select[name='programTypeId']");
    await language_select.select(language);
    // await page.click("checkbox[name='toggleEditorCheckbox']");
    // submit.
    await page.type("textarea[name='source']", code, {
        delay: 0,
    });
    // await page.click("button[type='submit']");
    const [response] = await Promise.all([
        page.waitForNavigation(),
        page.click("input[id='singlePageSubmitButton']")
    ]);

    const data = await page.content();
    const dom = new JSDOM(data);
    const $ = dom.window.document;
    const trs = $.querySelectorAll("tr");
    let ids = "";
    for (const tr of $.querySelectorAll("tr")) {
        if (tr.getAttribute("data-submission-id") !== null) {
            ids = tr.getAttribute("data-submission-id") || "";
            break;
        }
    }
    console.log(ids);
    return ids;
}