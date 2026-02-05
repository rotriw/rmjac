import { getPageContent } from "@/service/browser.ts";

export const any = async (url: string): Promise<string> => {
    const content = await getPageContent(url, true, "default");
    if (!content) {
        return "";
    }
    return content;
};