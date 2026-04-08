import { JSDOM } from "jsdom";
import { Problem, ProblemStatement, ContentType } from "../../declare/problem.ts";
import TurndownService from 'turndown';

export const convertHTML = async (value: Element): Promise<string> => {
    let res = value.innerHTML;
    res = await convertEasyHTMLToMarkdown(res);
    // 不再调用 markdownToTypstCode，直接保留 Markdown
    res = res.replace(/<br>/g, '\n');
    res = res.replace(/&nbsp;/g, ' ');
    res = res.replace(/&lt;/g, '<');
    res = res.replace(/&gt;/g, '>');
    res = res.replace(/&amp;/g, '&');
    // 图片占位符还原为 Markdown 格式
    res = res.replaceAll(/%imgstart%(.*?)%imgdone%/g, (_match, p1) => {
            return `![image](${p1.replaceAll('\\/', '/')})`
    })
    // 保护数学公式，反转义仅在公式外部
    const mathSegments: string[] = [];
    res = res.replaceAll(/%mathstart%(.*?)%mathend%/g, (_match, p1) => {
        const idx = mathSegments.length;
        mathSegments.push(p1);
        return `%%MATH_PROTECTED_${idx}%%`;
    });
    // 反转义 Turndown 的转义字符（仅在 LaTeX 公式外部）
    res = res.replaceAll("\\_", "_");
    res = res.replaceAll("\\*", "*");
    res = res.replaceAll("\\#", "#");
    res = res.replaceAll("\\{", "{");
    res = res.replaceAll("\\}", "}");
    res = res.replaceAll("\\(", "(");
    res = res.replaceAll("\\)", ")");
    res = res.replaceAll("\\|", "|");
    // 还原数学公式
    res = res.replaceAll(/%%MATH_PROTECTED_(\d+)%%/g, (_match, idx) => {
        return `$${mathSegments[parseInt(idx)]}$`;
    });
    return res;
}

const convertEasyHTMLToMarkdown = async (value: string): Promise<string> => {
    const turndownService = new TurndownService({ option: 'value' });
    turndownService.addRule('latexMathInAtcoder', {
        filter: ['var'],
        replacement: function (_content: string, node: any, _options: any) {
            // 保留原始 LaTeX，不再经过 convertTex2Typst
            return `%mathstart%${node.textContent}%mathend%`
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

export const convertAtcoderEnglishDomToMarkdown = async (content: Element): Promise<ContentType[]> => {
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
            problem_statements: await convertAtcoderEnglishDomToMarkdown(sanitizedLangEn),
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