import { getOnePage } from "../../service/browser.ts";
import { get_loc } from "../../utils/cf_click.ts";

export const loginWithPassword = async (handle: string, password: string): Promise<string | false> => {
    const url = "https://atcoder.jp/login";
    const browser = await getOnePage();
    const page = await browser.newPage();
    await page.goto(url);
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
    await new Promise(resolve => setTimeout(resolve, 1000));
    await page.type("input[name='username']", handle);
    await page.type("input[name='password']", password);
    await page.click("button[type='submit']");
    await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    const cookies = await browser.cookies();
    let session = "";
    for (const cookie of cookies) {
        if (cookie.name === "REVEL_SESSION") {
            session = cookie.value;
            break;
        }
    }
    await page.close();
    return session || false;
}

export const password = async (task: any) => {
    const { handle, password: pwd } = task;
    const session = await loginWithPassword(handle, pwd);
    return session;
}