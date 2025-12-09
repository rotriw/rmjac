// @ts-nocheck

import { JSDOM } from "jsdom";
import { Problem, ProblemStatement, ContentType } from "../../declare/problem.ts";
import { texToTypst } from 'tex-to-typst';
import { convertTex2Typst } from "../../utils/texToTypst.ts";
import TurndownService from 'turndown';
import { markdownToTypstCode } from "@mdpdf/mdpdf";


export const convertHTML = async (value: Element): string => {
    let res = value.innerHTML;
    res = await convertEasyHTMLToTypst(res);
    res = await markdownToTypstCode(res);
    res = res.split('\n').filter(line => !line.startsWith('#set ') && !line.startsWith('#let ') && !line.startsWith('#show') && line.replaceAll(" ", "").length > 0).join('\n');
    res = res.replace(/<br>/g, '\n');
    res = res.replace(/&nbsp;/g, ' ');
    res = res.replace(/&lt;/g, '<');
    res = res.replace(/&gt;/g, '>');
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
        replacement: function (_content: string, node: Element, _options: any) {
            return `%typststart%${convertTex2Typst(node.textContent)}%typstend%`
        }
    });
    turndownService.addRule('image', {
        filter: ['img'],
        replacement: function (_content, node, _options) {
            return '%imgstart%' + node.src + '%imgdone%'
        }
    });
    turndownService.addRule('center', {
        filter: ['center'],
        replacement: function (content, node, _options) {
            return '<center>' + content + '</center>'
        }
    });

    turndownService.addRule('p to new line', {
        filter: ['p'],
        replacement: function (content, node, _options) {
            return content + '\\n'
        }
    });
    const res = turndownService.turndown(value);
    return res;
}

export const convertAtcoderEnglishDomToTypst = async ($: Element): Promise<ContentType[]> => {
    const content = $;
    if (content == null) {
        return [];
    }
    const now_content = content;
    const used_statement = false, unknown_id = 1;
    const result = [];
    for (const child of now_content.children) {
        if (child.nodeName === 'DIV') {
            // have a section
            const nchild = child.querySelector("section");
            const h3 = nchild.querySelectorAll("h3");
            let section_title = h3[0].textContent?.trim() || "";
            nchild.removeChild(h3[0]);
            const content = await convertHTML(nchild);
            result.push({
                iden: section_title.toLowerCase(),
                content
            });
        }
    }
    return result;
}

export const parse = async (html: string, url: string): Problem => {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const titleElement = doc.querySelector("span.h2");
    let title = titleElement?.textContent?.trim() || "";
    title = title.replace(/^[A-Z]\s-\s/, "");

    // Time/Memory Limit
    const textContent = doc.body.textContent || "";
    const timeMatch = textContent.match(/Time Limit:\s*([\d\.]+)\s*sec/);
    const memoryMatch = textContent.match(/Memory Limit:\s*(\d+)\s*MB/);
    
    const time_limit = timeMatch ? parseFloat(timeMatch[1]) * 1000 : 2000;
    const memory_limit = memoryMatch ? parseInt(memoryMatch[1]) * 1024 : 256 * 1024;

    // Sections
    const taskStatement = doc.querySelector("#task-statement");
    const langEn = taskStatement?.querySelector("span.lang-en") || taskStatement; 
    
    const parts = langEn?.querySelectorAll("section") || [];
    const contents: ContentType[] = [];

    const problem_iden = url.split("/").pop() || "";

    const statement: ProblemStatement = {
        statement_source: "AtCoder",
        problem_source: "AtCoder",
        iden: problem_iden,
        problem_statements: await convertAtcoderEnglishDomToTypst(langEn),
        time_limit,
        memory_limit,
        sample_group: [],
        show_order: ["default"],
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
};


export interface Contest {
    id: string;
    name: string;
    url: string;
}

export const parseContests = (html: string): Contest[] => {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const contests: Contest[] = [];

    const tables = doc.querySelectorAll('.table-responsive > table');
    
    tables.forEach(table => {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const secondTd = row.querySelector('td:nth-child(2)');
            const link = secondTd?.querySelector('a');

            if (link && link.href) {
                const url = new URL(link.href, 'https://atcoder.jp').toString();
                const name = link.textContent?.trim() || '';
                const id = url.split('/').pop() || '';

                if (id && name) {
                    contests.push({ id, name, url });
                }
            }
        });
    });

    return contests;
};
