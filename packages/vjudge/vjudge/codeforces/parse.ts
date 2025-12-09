/*
Codeforces problem parser:
Codeforces HTML -> Easy HTML -> Markdown(convert math to typst) -> Typst.
*/

import { JSDOM } from "jsdom";
import { Problem, ProblemStatement } from "../../declare/problem.ts";
import { convertCodeforcesDomToSampleGroup, convertCodeforcesDomToTypst } from "./parse/tools.ts";

export async function parse(html: string, url: string): Promise<Problem | ""> {
    const dom = new JSDOM(html);
    const document = dom.window.document;

    const problemStatementDiv = document.querySelector(".problem-statement");
    if (!problemStatementDiv) {
        return "";
    }

    const header = problemStatementDiv.querySelector(".header");
    if (!header) return "";

    const title = header.querySelector(".title")?.textContent?.trim() || "";
    const problemName = title.substring(title.indexOf(". ") + 2);

    const timeLimitText = header.querySelector(".time-limit")?.textContent || "";
    const timeLimitMatch = timeLimitText.match(/(\d+(\.\d+)?)\s*seconds?/);
    const timeLimit = timeLimitMatch ? parseFloat(timeLimitMatch[1]) * 1000 : 0;

    const memoryLimitText = header.querySelector(".memory-limit")?.textContent || "";
    const memoryLimitMatch = memoryLimitText.match(/(\d+)\s*megabytes?/);
    const memoryLimit = memoryLimitMatch ? parseInt(memoryLimitMatch[1]) * 1024 : 0;

    const urlParts = url.match(/problemset\/problem\/(\d+)\/(\w+)/) || url.match(/contest\/(\d+)\/problem\/(\w+)/);
    if (!urlParts) return "";
    const contestId = urlParts[1];
    const problemIndex = urlParts[2];
    const problemIden = `${contestId}${problemIndex}`;

    const problemStatement: ProblemStatement = {
        statement_source: "codeforces",
        problem_source: "codeforces",
        iden: `CF${problemIden}`,
        problem_statements: await convertCodeforcesDomToTypst(dom),
        time_limit: timeLimit,
        memory_limit: memoryLimit,
        sample_group: convertCodeforcesDomToSampleGroup(dom),
        show_order: ["default"],
    };

    const result: Problem = {
        problem_source: "codeforces",
        problem_iden: `RmjCF${problemIden}`,
        problem_name: problemName,
        problem_statement: [problemStatement],
        creation_time: new Date().toISOString(),
        tags: [],
        user_id: 1,
    };

    console.log(result);
    return result;
}