import { getOnePage } from "../../service/browser.ts";
import { JSDOM } from "jsdom";
import { get_loc } from "../../utils/cf_click.ts";
import { add_monitor } from "./track.ts";
import {VjudgeNode} from "../../declare/node.ts";

export const submit = async (task: {
    vjudge_node: VjudgeNode,
    context: {
        code: string,
        record_id: string,
    },
    url: string,
    language_id: string,
    bypass_cf: boolean
}) => { try {
    const handle = task.vjudge_node.public.iden;
    const token = task.vjudge_node.private.auth.Token;
    const url = task.url;
    const [contest_id, problem_id] = url.split(":");
    const code = task.context.code;
    const browser = await getOnePage(handle);
    const page = await browser.newPage();
    const language = task.language_id;
    await browser.setCookie({
        name: "JSESSIONID",
        value: token as string,
        domain: "codeforces.com",
        path: "/",
        expires: -1,
        secure: false,
        httpOnly: true,
        sameSite: "Lax",
        size: (token as string).length,
        session: true,
    });

    await page.goto(`https://codeforces.com/contest/${contest_id}/submit`, { waitUntil: "domcontentloaded" });
    if (task.bypass_cf) {
        await page.setViewport({
            width: 2000,
            height: 1000,
            deviceScaleFactor: 2,
        });

        for (let i = 0; i < 10; i++) {
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
    }

    const problem_select = await page.waitForSelector("select[name='submittedProblemIndex']");
    if (problem_select) {
        await problem_select.select(problem_id);
    }
    page.evaluate((language) => {
        //@ts-ignore 幽默ts
        document.querySelector(`option[value='${language}']`).selected = true;
    }, language);

    await page.type("textarea[name='source']", code, {
        delay: 0,
    });

    await Promise.all([
        page.click("input[id='singlePageSubmitButton']"),
        page.waitForNavigation(),
    ]);

    const data = await page.content();
    console.log(data);
    const dom = new JSDOM(data);
    const $ = dom.window.document;
    const trs = $.querySelectorAll("tr");
    let submissionId = "";
    for (const tr of trs) {
        const id = tr.getAttribute("data-submission-id");
        if (id !== null) {
            submissionId = id;
            break;
        }
    }

    // 组装url
    const d_url = `https://codeforces.com/contest/${contest_id}/submission/${submissionId}`;

    console.log(`Submitted with id: ${submissionId}`);
    add_monitor(+task.context.record_id, +submissionId);
    await page.close();
    return {
        event: "submit_done",
        data: {
            success: true,
            record_id: +task.context.record_id,
            remote_url: d_url,
            message: "Submitted",
        },
    };
} catch (e) {
    return {
        event: "submit_done",
        data: {
            success: false,
            record_id: +task.context.record_id,
            remote_url: "",
            message: `Submit failed: ${(e as Error).message || e}`,
        },
    }

}}