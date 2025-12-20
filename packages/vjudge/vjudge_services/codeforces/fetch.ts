import { getPageContent } from "@/service/browser.ts";

export const fetch = async (url: string): Promise<string> => {
    const content = await getPageContent(url, true);
    if (!content) {
        return "";
    }
    return content;
};