import { connect } from "puppeteer-real-browser";
import { Browser } from "npm:rebrowser-puppeteer-core";
//@ts-ignore
import plugin from "puppeteer-extra-plugin-click-and-wait";
import axios from "axios";



class BrowserPool {
    private pool: Record<string, Browser> = {};
    private visitOrder: string[] = [];
    private readonly maxSize: number;

    constructor(maxSize: number = 20) {
        this.maxSize = maxSize;
    }

    async acquire(uid: string): Promise<Browser> {
        if (this.pool[uid]) {
            return this.pool[uid];
        }
        if (this.visitOrder.length >= this.maxSize) {
            const oldestUid = this.visitOrder.shift()!;
            const oldestBrowser = this.pool[oldestUid];
            await oldestBrowser.close();
            delete this.pool[oldestUid];
        }
        this.visitOrder.push(uid);
        const { browser } = await connect({
            headless: false,
            plugins: [plugin()],
            args: [
                '--no-sandbox',
            ],
        });
        browser.newPage();
        this.pool[uid] = browser;
        return browser;
    }
}

const browserPool = new BrowserPool();

async function getContentWithBrowser(url: string, uid: string | undefined): Promise<string> {
    let browser: any | null = null;
    try {
        browser = await browserPool.acquire(uid || "default");
        const new_tab = await browser.newPage();
        const _ = await new_tab.goto(url);
        if ((await new_tab?.content()).includes("Just a moment...")) {
            await new_tab.clickAndWaitForNavigation("body");
        }
        const new_value = await new_tab.goto(url);
        const data = (await new_value.text());
        new_tab.close();
        return data;
    } catch (e) {
        LOG.error(`Error fetching ${url} with browser:`, e);
        return "";
    }
}

async function getContentWithAxios(url: string): Promise<string> {
    try {
        const response = await axios.get(url);
        if (response.status !== 200) {
            LOG.error(`Failed to fetch ${url} with axios: ${response.status}`);
            return "";
        }
        return response.data;
    } catch (e) {
        LOG.error(`Error fetching ${url} with axios:`, e);
        return "";
    }
}

export async function getPageContent(url: string, useBrowser: boolean, uid: string | undefined): Promise<string> {
    if (useBrowser) {
        return await getContentWithBrowser(url, uid);
    } else {
        return await getContentWithAxios(url);
    }
}

export async function getOnePage(uid: string | undefined) {
    return await browserPool.acquire(uid || "default");
}