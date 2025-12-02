import { connect } from "puppeteer-real-browser";
//@ts-ignore
import plugin from "puppeteer-extra-plugin-click-and-wait";
import axios from "axios";

class BrowserPool {
    private pool: any[] = [];
    private readonly maxSize: number;

    constructor(maxSize: number = 5) {
        this.maxSize = maxSize;
    }

    async acquire(): Promise<any> {
        if (this.pool.length > 0) {
            return this.pool.pop()!;
        }
        const { browser } = await connect({
            headless: false,
            plugins: [plugin()],
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage',
                '--disable-gpu'
            ]
        });
        return browser;
    }

    async release(browser: any) {
        if (this.pool.length < this.maxSize) {
            this.pool.push(browser);
        } else {
            await browser.close();
        }
    }
}

const browserPool = new BrowserPool();

async function getContentWithBrowser(url: string): Promise<string> {
    let browser: any | null = null;
    try {
        browser = await browserPool.acquire();
        const page = await browser.newPage();
        await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
        let page_content = await page.content();
        if (!page_content.includes("problem-statement")) {
            await page.clickAndWaitForNavigation("body");
            await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 })
            await page.waitForSelector(".problem-statement", { timeout: 10000 });
            page_content = await page.content();
        }
        await page.close();
        return page_content;
    } catch (e) {
        console.error(`Error fetching ${url} with browser:`, e);
        return "";
    } finally {
        if (browser) {
            await browserPool.release(browser);
        }
    }
}

async function getContentWithAxios(url: string): Promise<string> {
    try {
        const response = await axios.get(url);
        if (response.status !== 200) {
            console.error(`Failed to fetch ${url} with axios: ${response.status}`);
            return "";
        }
        return response.data;
    } catch (e) {
        console.error(`Error fetching ${url} with axios:`, e);
        return "";
    }
}

export async function getPageContent(url: string, useBrowser: boolean): Promise<string> {
    if (useBrowser) {
        return await getContentWithBrowser(url);
    } else {
        return await getContentWithAxios(url);
    }
}