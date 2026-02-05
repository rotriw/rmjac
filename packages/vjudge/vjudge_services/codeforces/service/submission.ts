import { z } from "npm:zod";
import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { getOnePage } from "@/service/browser.ts";

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
    const browser = await getOnePage(handle);
    const page = await browser.newPage();
    console.log(page);
    await page.goto("https://codeforces.com/enter");
    if (!(await page.content()).includes("Please wait") && !(await page.content()).includes("Login")) {
        //@ts-ignore 幽默ts
        await page.clickAndWaitForNavigation("body");
        await new Promise(resolve => setTimeout(resolve, 3000));
    }
    await page.type("input[name='handleOrEmail']", handle);
    await page.type("input[name='password']", password);
    await page.click("input[type='submit']");

    await page.waitForNavigation({ waitUntil: "domcontentloaded" });
    // await new Promise(resolve => setTimeout(resolve, 3000));
    if (!(await page.content()).includes(handle)) {
        return "";

    }
    console.log(await browser.cookies());
    const cookies = await browser.cookies();
    for (const cookie of cookies) {
        if (cookie.name === "JSESSIONID") {
            return cookie.value;
        }
    }
    return "";
}

export async function checkLoginWithToken(
    handle: string,
    token: string,
): Promise<boolean> {
    try {
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
            session: true,
            sourceScheme: "Secure",
            sameParty: false,
        });
        await page.goto("https://codeforces.com/");
        if (!(await page.content()).includes("Home") && !(await page.content()).includes("Top")) {
            //@ts-ignore 幽默ts
            await page.clickAndWaitForNavigation("body");
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        // await page.reload({ waitUntil: "domcontentloaded" });
        const content = await page.content();
        if (content.includes(handle)) {
            return true;
        }
    } catch (e) {
        console.log(`Error checking login with token: ${e}`);
    }
    return false;
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
