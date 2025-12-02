// @ts-nocheck

import { Problem, ProblemStatement } from "../declare/problem.ts";
import * as fs from "node:fs/promises";
import * as path from "node:path";
import { JSDOM } from "jsdom";
import { convertCodeforcesDomToSampleGroup, convertCodeforcesDomToTypst } from "../vjudge/codeforces/parse/tools.ts";

async function getProblem(contestId: string, problemIndex: string): Promise<Problem | string> {
    const dataPath = path.join(import.meta.dirname, "../data/codeforces/problem.txt");

    const fileContent = await fs.readFile(dataPath, "utf-8");
    const lines = fileContent.split('\n');
    const metadataLine = lines[0];
    const metadata = JSON.parse(metadataLine);

    const problemInfo = metadata.result.problems.find(p => p.contestId.toString() === contestId && p.index === problemIndex);

    if (!problemInfo) {
        console.error(`Problem ${contestId}${problemIndex} not found in metadata`);
        return "";
    }

    const problem: Problem = {
        title: problemInfo.name,
        source: "codeforces",
        source_id: `${problemInfo.contestId}${problemInfo.index}`,
        tags: problemInfo.tags,
        statement: null,
    };

    const htmlLines = lines.slice(1);
    let problemHtml = "";
    let inProblem = false;
    const startTag = `<div class="problemindexholder" problemindex="${problemIndex}"`;

    for (const line of htmlLines) {
        if (line.includes(startTag)) {
            inProblem = true;
        }
        if (inProblem) {
            problemHtml += line + '\n';
            if (line.includes("</div>") && line.includes("problemindexholder")) { // Heuristic end
                // This is a simplification; a more robust solution would parse nested divs.
                // For now, we assume the problem holder div ends on a line containing its closing tag.
                // Let's find the next problem to delimit the end more accurately.
            }
        }
    }

    // A better way to find the end of the problem block
    const startIndex = htmlLines.findIndex(line => line.includes(startTag));
    if (startIndex === -1) {
        console.error(`Problem start tag for ${problemIndex} not found in HTML`);
        return "";
    }

    let endIndex = htmlLines.findIndex((line, index) => index > startIndex && line.includes('<div class="problemindexholder"'));
    if (endIndex === -1) {
        endIndex = htmlLines.length;
    }

    problemHtml = htmlLines.slice(startIndex, endIndex).join('\n');

    if (!problemHtml) {
        console.error(`Could not extract HTML for problem ${problemIndex}`);
        return "";
    }

    const dom = new JSDOM(problemHtml);
    const document = dom.window.document;

    const statement: ProblemStatement = {
        content: convertCodeforcesDomToTypst(dom),
        sample_group: convertCodeforcesDomToSampleGroup(dom),
        time_limit: (document.querySelector(".time-limit")?.textContent || "").replace('time limit per test', '').trim(),
        memory_limit: (document.querySelector(".memory-limit")?.textContent || "").replace('memory limit per test', '').trim()
    };

    problem.statement = statement;

    return problem;
}

async function saveProblem(problem: Problem) {
    const response = await fetch("http://localhost:1824/api/problem", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
        },
        body: JSON.stringify(problem),
    });
    return response.json();
}

async function main() {
    const problem = await getProblem("2010", "A");
    if (problem !== "") {
        const result = await saveProblem(problem);
        console.log(result);
    }
}

main();