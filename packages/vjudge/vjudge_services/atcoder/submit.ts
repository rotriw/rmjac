import { getOnePage } from "../../service/browser.ts";
import { JSDOM } from "jsdom";

export const submit = async (task: any) => {
    const { token, contest_id, problem_id, code, language } = task;
    const browser = await getOnePage();
    const page = await browser.newPage();
    
    await browser.setCookie({
        name: "REVEL_SESSION",
        value: token,
        domain: "atcoder.jp",
        path: "/",
        expires: -1,
        secure: true,
        httpOnly: true,
        sameSite: "Lax",
    } as any);

    await page.goto(`https://atcoder.jp/contests/${contest_id}/submit`, { waitUntil: "domcontentloaded" });

    const problem_select = await page.waitForSelector("select[name='data.TaskScreenName']");
    if (problem_select) {
        await problem_select.select(problem_id);
    }

    const language_select = await page.waitForSelector("select[name='data.LanguageId']");
    if (language_select) {
        await language_select.select(language);
    }

    // AtCoder uses CodeMirror for the source code textarea, but it usually has a hidden textarea
    await page.type("textarea[name='sourceCode']", code);

    await Promise.all([
        page.waitForNavigation(),
        page.click("button[id='submit']")
    ]);

    const url = page.url();
    const submissionId = url.split("/").pop() || "";

    await page.close();
    return submissionId;
}