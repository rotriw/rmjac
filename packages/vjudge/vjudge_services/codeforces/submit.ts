import { getOnePage } from "../../service/browser.ts";
import { JSDOM } from "jsdom";
import { get_loc } from "../../utils/cf_click.ts";

export const submit = async (task: any) => {
    const { handle, token, contest_id, problem_id, code, language } = task;
    const browser = await getOnePage();
    const page = await browser.newPage();
    
    await browser.setCookie({
        name: "JSESSIONID",
        value: token,
        domain: "codeforces.com",
        path: "/",
        expires: -1,
        secure: false,
        httpOnly: true,
        sameSite: "Lax",
    } as any);

    await page.goto(`https://codeforces.com/contest/${contest_id}/submit`, { waitUntil: "domcontentloaded" });
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

    const problem_select = await page.waitForSelector("select[name='submittedProblemIndex']");
    if (problem_select) {
        await problem_select.select(problem_id);
    }

    const language_select = await page.waitForSelector("select[name='programTypeId']");
    if (language_select) {
        await language_select.select(language);
    }

    await page.type("textarea[name='source']", code, {
        delay: 0,
    });

    await Promise.all([
        page.waitForNavigation(),
        page.click("input[id='singlePageSubmitButton']")
    ]);

    const data = await page.content();
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

    await page.close();
    return submissionId;
}