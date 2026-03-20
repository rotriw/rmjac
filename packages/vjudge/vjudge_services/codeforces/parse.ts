import { JSDOM } from "jsdom";
import { Problem, ProblemStatement, ContentType } from "../../declare/problem.ts";
import TurndownService from 'turndown';

export const classNameReflect = {
    "tex-formula": ["<span>", "</span>"],
    "tex-span": ["<span>", "</span>"],
    "tex-font-style-bf": ["<strong>", "</strong>"],
    "tex-font-style-it": ["<i>", "</i>"],
    "tex-font-style-sl": ["<i>", "</i>"],
    "tex-font-style-tt": ["<i>", "</i>"],
    "tex-font-size-small": ["<small>", "</small>"],
    "epigraph": ["%epigraph%", "%endepigraph%"],
    "epigraph-text": ["%epigraphtext%", "%endepigraphtext%"],
    "epigraph-source": ["%epigraphsource%", "%endepigraphsource%"],
}

const convertCSS = (value: Element): Element => {
    for (const val in classNameReflect) {
        const reg = (classNameReflect as any)[val];
        const specfic = value.querySelectorAll(`.${val}`);
        for (const child of specfic) {
            child.outerHTML = `${reg[0]}${child.innerHTML}${reg[1]}`;
        }
    }
    return value;
}

const convertEasyHTMLToMarkdown = async(res: string): Promise<string> => {
    const turndownService = new TurndownService({ option: 'value' });
    turndownService.addRule('latexMath', {
        filter: ['typst'],
        replacement: function (_content: string, node: any, _options: any) {
            // 保留原始 LaTeX，用 $...$ 包裹
            return '%mathstart%' + (node as any).innerHTML + '%mathend%'
        }
    });
    turndownService.addRule('image', {
        filter: ['img'],
        replacement: function (_content: string, node: any, _options: any) {
            return `![image](${(node as any).src})`
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
            return content + '\n\n'
        }
    });
    turndownService.addRule('small', {
        filter: ['small'],
        replacement: function (content: string, _node: any, _options: any) {
            return content
        }
    });
    res = turndownService.turndown(res);
    // 不再调用 markdownToTypstCode，直接保留 Markdown
    res = res.replace(/<br>/g, '\n');
    res = res.replace(/&nbsp;/g, ' ');
    res = res.replace(/</g, '<');
    res = res.replace(/>/g, '>');
    // epigraph 处理为 blockquote
    res = res.replaceAll(/%epigraph%(.*?)%endepigraph%/g, (_match, p1) => {
        return `> ${p1}`
    })
    res = res.replaceAll(/%epigraphtext%(.*?)%endepigraphtext%/g, (_match, p1) => {
        return `> ${p1}`
    })
    res = res.replaceAll(/%epigraphsource%(.*?)%endepigraphsource%/g, (_match, p1) => {
        return `> — ${p1}`
    })
    // 反转义 Turndown 的转义字符（仅在 LaTeX 公式外部）
    // 先把数学公式占位符中的内容保护起来
    const mathSegments: string[] = [];
    res = res.replaceAll(/%mathstart%(.*?)%mathend%/g, (_match, p1) => {
        const idx = mathSegments.length;
        mathSegments.push(p1);
        return `%%MATH_PROTECTED_${idx}%%`;
    });
    // 在公式外部反转义
    res = res.replaceAll("\\_", "_");
    res = res.replaceAll("\\*", "*");
    res = res.replaceAll("\\#", "#");
    res = res.replaceAll("\\{", "{");
    res = res.replaceAll("\\}", "}");
    res = res.replaceAll("\\(", "(");
    res = res.replaceAll("\\)", ")");
    res = res.replaceAll("\\|", "|");
    // 还原数学公式，保留原始 LaTeX 不受反转义影响
    res = res.replaceAll(/%%MATH_PROTECTED_(\d+)%%/g, (_match, idx) => {
        return `$${mathSegments[parseInt(idx)]}$`;
    });
    return res;
}

const convertToEasyHTML = (value: Element): string => {
    let res = value.innerHTML;
    res = res.replaceAll(/<br>/g, '\n');
    res = res.replaceAll(/&nbsp;/g, ' ');
    res = res.replaceAll(/&lt;/g, '<');
    res = res.replaceAll(/&gt;/g, '>');
    res = res.replaceAll(/&amp;/g, '&');
    // 保留原始 LaTeX（不再转 Typst），用 <typst> 标签包裹以便 Turndown 规则处理
    const regex = /\$\$\$(.*?)\$\$\$/gs;
    res = res.replaceAll(regex, function(_match, p1) {
        return `<typst>${p1}</typst>`;
    });
    res = res.replaceAll(/<typst>#none\^"(.*?)"<\/typst>/g, (_match, p1) => {
        return `%footnote%${p1}%endfootnote%`;
    });
    return res;
}

export const convertHTML = async (value: Element): Promise<string> => {
    value = convertCSS(value);
    const lafootnote = value.querySelector('.statement-footnote');
    value.querySelector('.statement-footnote')?.remove();
    let res = convertToEasyHTML(value);
    res = await convertEasyHTMLToMarkdown(res);
    if (lafootnote) {
        let footnote = convertToEasyHTML(lafootnote);
        footnote = await convertEasyHTMLToMarkdown(footnote);
        footnote = footnote.replaceAll(/%footnote%(.*?)%endfootnote%/g, (_match, p1) => {
            return `<comment>${p1}:`
        });
        const footnoteParts = footnote.split('<comment>');
        for (let i = 1; i < footnoteParts.length; i++) {
            const parts = footnoteParts[i].split(':');
            const content = parts.slice(1).join(':').trim();
            res = res.replaceAll(`%footnote%${parts[0].trim()}%endfootnote%`, `[^${parts[0].trim()}]: ${content}`);
        }
    }
    res = res.replaceAll(/%footnote%(.*?)%endfootnote%/g, (_match, p1) => {
        return `[^${p1}]`;
    });
    return res;
}

export const convertCodeforcesDomToMarkdown = async (dom: JSDOM): Promise<ContentType[]> => {
    const content = dom.window.document.querySelector('.problem-statement');
    if (content == null) {
        return [];
    }
    const result = [];
    let unknown_id = 1;
    for (const child of content.children) {
        if (child.nodeName === 'DIV') {
            if (child.classList.contains('header') || child.classList.contains('sample-test')) {
                continue;
            }
            let contest_title = "";
            for (const find_title of child.children) {
                if (find_title.classList.contains('section-title')) {
                    contest_title = find_title.textContent || "";
                    child.removeChild(find_title);
                    break;
                }
            }
            if (contest_title === "") {
                contest_title = result.length > 0 ? `Unknown Additional ${unknown_id++}` : "statement";
            }
            const contentStr = await convertHTML(child);
            result.push({
                iden: contest_title.toLowerCase(),
                content: contentStr
            });
        }
    }
    return result;
}

export const convertCodeforcesDomToSampleGroup = (dom: JSDOM): [string, string][] => {
    const samples = dom.window.document.querySelectorAll('.sample-test');
    const res: [string, string][] = [];
    for (const sample of samples) {
        const inputs = sample.querySelectorAll('.input');
        const outputs = sample.querySelectorAll('.output');
        for (let i = 0; i < inputs.length; i++) {
            const input_pre = inputs[i].querySelector('pre');
            const output_pre = outputs[i].querySelector('pre');
            if (input_pre && output_pre) {
                const processPre = (pre: Element) => {
                    const divs = pre.querySelectorAll('div');
                    if (divs.length > 0) {
                        let text = "";
                        divs.forEach(div => text += div.textContent + "\n");
                        return text.trim();
                    }
                    return (pre.innerHTML || "").replace(/<br\s*\/?>/gi, "\n").trim();
                };
                res.push([processPre(input_pre), processPre(output_pre)]);
            }
        }
    }
    return res;
}

export const parse = async (html: string, url: string): Promise<Problem | ""> => {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const urlParts = url.match(/problemset\/problem\/(\d+)\/(\w+)/) || url.match(/contest\/(\d+)\/problem\/(\w+)/);
    let contestId = urlParts?.[1] || "unk";
    let problemIndex = urlParts?.[2] || "unk";

    if (contestId === "unk") {
        problemIndex = document.querySelector(".problemindexholder")?.getAttribute("problemindex")?.trim() || "unk";
        const links = document.querySelectorAll("a");
        for (const link of links) {
            const href = link.getAttribute("href") || "";
            const match = href.match(/\/(contest|gym)\/(\d+)/);
            if (match) {
                contestId = match[2];
                break;
            }
        }
    }

    const problemIden = `${contestId}${problemIndex}`;
    let problemName = "";
    let timeLimit = 0;
    let memoryLimit = 0;
    let tag_list: string[] = [];
    let difficulty: number | null = null;

    const buildProblem = (problemStatement: ProblemStatement, name: string, tags: string[]): Problem => ({
        problem_iden: `CF${problemIden}`,
        problem_name: name,
        problem_statement: [problemStatement],
        creation_time: new Date().toISOString(),
        tags,
        user_id: 1,
    });

    try {
        const problemStatementDiv = document.querySelector(".problem-statement");
        if (!problemStatementDiv) throw new Error("Missing .problem-statement");

        const header = problemStatementDiv.querySelector(".header");
        if (!header) throw new Error("Missing problem header");

        const title = header.querySelector(".title")?.textContent?.trim() || "";
        problemName = title.substring(title.indexOf(". ") + 2) || `Codeforces ${problemIden}`;

        const timeLimitText = header.querySelector(".time-limit")?.textContent || "";
        const timeLimitMatch = timeLimitText.match(/(\d+(\.\d+)?)\s*seconds?/);
        timeLimit = timeLimitMatch ? parseFloat(timeLimitMatch[1]) * 1000 : 0;

        const memoryLimitText = header.querySelector(".memory-limit")?.textContent || "";
        const memoryLimitMatch = memoryLimitText.match(/(\d+)\s*megabytes?/);
        memoryLimit = memoryLimitMatch ? parseInt(memoryLimitMatch[1]) * 1024 : 0;

        let diff = -1;
        tag_list = [];
        document.querySelectorAll(".sidebox").forEach(box => {
            if (box.querySelector(".caption")?.textContent?.trim().includes("Problem tags")) {
                box.querySelectorAll(".tag-box").forEach(tag => {
                    const tagText = tag.textContent?.trim() || "";
                    if (tagText.startsWith("*")) diff = parseInt(tagText.substring(1));
                    else if (tagText) tag_list.push(tagText);
                });
            }
        });
        difficulty = diff === -1 ? null : diff;

        const problemStatements = await convertCodeforcesDomToMarkdown(dom);
        if (problemStatements.length === 0) throw new Error("Empty problem statements parsed");

        const problemStatement: ProblemStatement = {
            statement_source: "codeforces",
            problem_source: "codeforces",
            page_source: html,
            iden: `CF${problemIden}`,
            problem_statements: problemStatements,
            time_limit: timeLimit,
            memory_limit: memoryLimit,
            sample_group: convertCodeforcesDomToSampleGroup(dom),
            show_order: ["default_codeforces"],
            problem_difficulty: difficulty,
            page_rendered: undefined,
            judge_option: {
                "p_id": problemIndex,
                "c_id": contestId,
            }
        };

        return buildProblem(problemStatement, problemName, tag_list);
    } catch (_error) {
        const problemSectionHtml = document.querySelector(".problem-statement")?.outerHTML?.trim() || "";

        // Fallback to body without top header/navigation if the problem section is missing or empty.
        let bodyWithoutHeader = "";
        try {
            const bodyClone = document.body.cloneNode(true) as HTMLElement;
            bodyClone.querySelectorAll('header').forEach(h => h.remove());
            bodyClone.querySelector('#header')?.remove();
            bodyWithoutHeader = bodyClone.innerHTML.trim();
        } catch (_) {
            bodyWithoutHeader = "";
        }

        const pageRendered = problemSectionHtml || bodyWithoutHeader || html;

        const fallbackProblemStatement: ProblemStatement = {
            statement_source: "codeforces",
            problem_source: "codeforces",
            page_source: html,
            iden: `CF${problemIden}`,
            problem_statements: [{ iden: "render_html", content: "render_html" }],
            time_limit: timeLimit,
            memory_limit: memoryLimit,
            sample_group: [],
            show_order: ["render_html"],
            problem_difficulty: difficulty,
            page_rendered: pageRendered,
            judge_option: {
                "p_id": problemIndex,
                "c_id": contestId,
            }
        };

        const fallbackName = problemName || document.querySelector("title")?.textContent?.trim() || `Codeforces ${problemIden}`;
        return buildProblem(fallbackProblemStatement, fallbackName, tag_list);
    }
}