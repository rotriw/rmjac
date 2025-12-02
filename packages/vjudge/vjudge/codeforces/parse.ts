import { JSDOM } from "jsdom";
import { Problem, ProblemStatement } from "../../declare/problem";
import { convertCodeforcesDomToSampleGroup, convertCodeforcesDomToTypst } from "./parse/tools";

export function parse(html: string, url: string): Problem | "" {
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
        problem_iden: problemIden,
        problem_statements: convertCodeforcesDomToTypst(dom),
        time_limit: timeLimit,
        memory_limit: memoryLimit,
        sample_group: convertCodeforcesDomToSampleGroup(dom),
    };

    const result: Problem = {
        problem_source: "codeforces",
        problem_iden: problemIden,
        problem_name: problemName,
        problem_statement: [problemStatement],
        creation_time: new Date().toISOString(),
        tags: [],
    };

    return result;
}