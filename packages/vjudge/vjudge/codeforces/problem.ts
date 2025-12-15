import { Problem } from "@/declare/problem.ts";
import { getPageContent } from "@/service/browser.ts";
import { parse as parseProblem } from "./parse/parse.ts";

const fetch = async (url: string): Promise<string> => {
    const content = await getPageContent(url, true);
    if (!content) {
        return "";
    }
    return content;
}

const parse = async (content: string, url: string): Promise<Problem | ""> => {
    return await parseProblem(content, url);
}

export {
    fetch,
    parse,
}