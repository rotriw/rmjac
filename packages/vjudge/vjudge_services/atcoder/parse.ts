import { JSDOM } from "jsdom";
import { Problem, ProblemStatement, ContentType } from "../../declare/problem.ts";
import { convertTex2Typst } from "../../utils/texToTypst.ts";
import TurndownService from 'turndown';
import { markdownToTypstCode } from "@mdpdf/mdpdf";

export const convertHTML = async (value: Element): Promise<string> => {
    let res = value.innerHTML;
    res = await convertEasyHTMLToTypst(res);
    res = await markdownToTypstCode(res);
    res = res.split('\n').filter(line => !line.startsWith('#set ') && !line.startsWith('#let ') && !line.startsWith('#show') && line.replaceAll(" ", "").length > 0).join('\n');
    res = res.replace(/<br>/g, '\n');
    res = res.replace(/&nbsp;/g, ' ');
    res = res.replace(/</g, '<');
    res = res.replace(/>/g, '>');
    res = res.replaceAll(/%imgstart%(.*?)%imgdone%/g, (_match, p1) => {
            return `#figure(image("${p1.replaceAll('\\/', '/')}", width: 60%))`
    })

    res = res.replaceAll(/%typststart%(.*?)%typstend%/g, (_match, p1) => {
        return `$${p1.replaceAll('\\\\', '%xgg%').replaceAll('\\', '').replaceAll('%xgg%', '\\')}$`
    })

    res = res.replaceAll("\\_", "_");
    res = res.replaceAll("\\*", "*");
    res = res.replaceAll("\\#", "#");
    res = res.replaceAll("\\{", "{");
    res = res.replaceAll("\\}", "}");
    res = res.replaceAll("\\(", "(");
    res = res.replaceAll("\\)", ")");
    res = res.replaceAll("\\|", "|");
    return res;
}

const convertEasyHTMLToTypst = async (value: string): Promise<string> => {
    const turndownService = new TurndownService({ option: 'value' });
    turndownService.addRule('typstMathInAtcoder', {
        filter: ['var'],
        replacement: function (_content: string, node: any, _options: any) {
            return `%typststart%${convertTex2Typst(node.textContent)}%typstend%`
        }
    });
    turndownService.addRule('image', {
        filter: ['img'],
        replacement: function (_content: string, node: any, _options: any) {
            return '%imgstart%' + node.src + '%imgdone%'
        }
    });
    turndownService.addRule('center', {
        filter: ['center'],
        replacement: function (content: string, _node: any, _options: any) {
            return '<center>' + content + '</center>'
        }
    });

    turndownService.addRule('p to new line', {
        filter: ['p'],
        replacement: function (content: string, _node: any, _options: any) {
            return content + '\n'
        }
    });
    const res = turndownService.turndown(value);
    return res;
}

export const convertAtcoderEnglishDomToTypst = async (content: Element): Promise<ContentType[]> => {
    if (content == null) {
        return [];
    }
    const result = [];
    for (const child of content.children) {
        if (child.nodeName === 'DIV') {
            const nchild = child.querySelector("section");
            if (!nchild) continue;
            const h3 = nchild.querySelectorAll("h3");
            if (h3.length === 0) continue;
            let section_title = h3[0].textContent?.trim() || "";
            nchild.removeChild(h3[0]);
            const contentStr = await convertHTML(nchild);
            result.push({
                iden: section_title.toLowerCase(),
                content: contentStr
            });
        }
    }
    return result;
}

const stripEditorial = (content: Element): Element => {
    const clone = content.cloneNode(true) as Element;
    clone.querySelectorAll("a").forEach(anchor => {
        if (anchor.textContent?.trim() === "Editorial") {
            const parent = anchor.parentElement;
            if (parent && parent.textContent?.trim() === "Editorial") {
                parent.remove();
            } else {
                anchor.remove();
            }
        }
    });
    clone.querySelectorAll("*").forEach(node => {
        if (node.children.length === 0 && node.textContent?.trim() === "Editorial") {
            node.remove();
        }
    });
    return clone;
};

const extractContestId = (url: string): string => {
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        const contestIndex = parts.indexOf("contests");
        if (contestIndex >= 0 && parts.length > contestIndex + 1) {
            return parts[contestIndex + 1];
        }
        return "";
    } catch (_error) {
        return "";
    }
};

export const parse = async (html: string, url: string): Promise<Problem | ""> => {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const titleElement = doc.querySelector("span.h2");
    let title = titleElement?.textContent?.trim() || "";
    title = title.replace(/^[A-Z]\s-\s/, "");

    const textContent = doc.body.textContent || "";
    const timeMatch = textContent.match(/Time Limit:\s*([\d\.]+)\s*sec/);
    const memoryMatch = textContent.match(/Memory Limit:\s*(\d+)\s*MB/);
    
    const time_limit = timeMatch ? parseFloat(timeMatch[1]) * 1000 : 2000;
    const memory_limit = memoryMatch ? parseInt(memoryMatch[1]) * 1024 : 256 * 1024;

    const taskStatement = doc.querySelector("#task-statement");
    const langEn = taskStatement?.querySelector("span.lang-en") || taskStatement; 

    if (!langEn) return "";

    const problem_iden = url.split("/").pop() || "";
    const contest_id = extractContestId(url);

    const sanitizedLangEn = stripEditorial(langEn);
    const statementHtml = sanitizedLangEn.innerHTML ?? "";

    try {
        const statement: ProblemStatement = {
            statement_source: "AtCoder",
            problem_source: "AtCoder",
            page_source: statementHtml,
            iden: problem_iden,
            problem_statements: await convertAtcoderEnglishDomToTypst(sanitizedLangEn),
            time_limit,
            memory_limit,
            sample_group: [],
            show_order: ["default"],
            problem_difficulty: null,
            page_rendered: null,
            judge_option: {
                "c_id": contest_id,
                "p_id": problem_iden,
            },
        };

        return {
            problem_source: "AtCoder",
            problem_iden: problem_iden,
            problem_name: title,
            problem_statement: [statement],
            creation_time: new Date().toISOString(),
            tags: [],
            user_id: 1,
        };
    } catch (_error) {
        const fallbackRendered = statementHtml || taskStatement?.innerHTML?.trim() || doc.body.innerHTML.trim();

        const fallbackStatement: ProblemStatement = {
            statement_source: "AtCoder",
            problem_source: "AtCoder",
            page_source: statementHtml,
            iden: problem_iden,
            problem_statements: [{ iden: "render_html", content: "render_html" }],
            time_limit,
            memory_limit,
            sample_group: [],
            show_order: ["render_html"],
            problem_difficulty: null,
            page_rendered: fallbackRendered,
            judge_option: {
                "c_id": contest_id,
                "p_id": problem_iden,
            },
        };

        return {
            problem_source: "AtCoder",
            problem_iden: problem_iden,
            problem_name: title || doc.querySelector("title")?.textContent?.trim() || `AtCoder ${problem_iden}`,
            problem_statement: [fallbackStatement],
            creation_time: new Date().toISOString(),
            tags: [],
            user_id: 1,
        };
    }
};