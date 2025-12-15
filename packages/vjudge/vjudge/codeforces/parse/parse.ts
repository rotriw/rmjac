/*
Codeforces problem parser.
Codeforces HTML -> Easy HTML -> Markdown(convert math to typst) -> Typst.
*/


import { JSDOM } from "jsdom";
import { Problem, ProblemStatement } from "@/declare/problem.ts";
import { convertCodeforcesDomToSampleGroup, convertCodeforcesDomToTypst } from "./tools.ts";

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

    let urlParts = url.match(/problemset\/problem\/(\d+)\/(\w+)/) || url.match(/contest\/(\d+)\/problem\/(\w+)/);
    if (!urlParts) {
        // find from page.
        const problemIndex = document.querySelector(".problem-index")?.textContent?.trim() || "";
        const contestId = document.querySelector(".contest-id")?.textContent?.trim() || "";
        urlParts = [contestId, problemIndex];
    }
    const contestId = urlParts[1];
    const problemIndex = urlParts[2];
    const problemIden = `${contestId}${problemIndex}`;



    // find tags from page.
    const tag_list: string[] = [];
    let difficulty = -1;
    const boxes = document.querySelectorAll(".sidebox");
    for (const box of boxes) {
        const title = box.querySelector(".caption")?.textContent?.trim() || "";
        if (title.includes("Problem tags")) {
            const tags = box.querySelectorAll(".tag-box");
            tags.forEach(tag => {
                const tagText = tag.textContent?.trim();
                if (tagText.startsWith("*")) {
                    difficulty = parseInt(tagText.substring(1));
                    return;
                }
                if (tagText.length > 0) {
                    tag_list.push(tagText);
                }
            });
            break;
        }
    }


    const problemStatement: ProblemStatement = {
        statement_source: "codeforces",
        problem_source: "codeforces",
        iden: `CF${problemIden}`,
        problem_statements: await convertCodeforcesDomToTypst(dom),
        time_limit: timeLimit,
        memory_limit: memoryLimit,
        sample_group: convertCodeforcesDomToSampleGroup(dom),
        show_order: ["default_codeforces"],
        problem_difficulty: difficulty === -1 ? null : difficulty,
        problem_tag_list: tag_list,
    };

    const result: Problem = {
        problem_source: "codeforces",
        problem_iden: `RmjCF${problemIden}`,
        problem_name: problemName,
        problem_statement: [problemStatement],
        creation_time: new Date().toISOString(),
        tags: tag_list,
        user_id: 1,
    };

    console.log(result);
    return result;
}