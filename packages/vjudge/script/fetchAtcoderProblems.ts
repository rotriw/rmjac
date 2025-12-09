import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import * as fs from "https://deno.land/std@0.207.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.207.0/path/mod.ts";
import { Problem, ProblemStatement, ContentType } from "../declare/problem.ts";
// @deno-types="npm:@types/tex-to-typst"
import { texToTypst } from "npm:tex-to-typst";
import { parse } from "../vjudge/atcoder/parse.ts";


// Helper to convert LaTeX to Typst
function convertLatexToTypst(latex: string): string {
    try {
        // tex-to-typst might fail on some complex or malformed LaTeX
        return texToTypst(latex).value;
    } catch (e) {
        console.warn("Failed to convert LaTeX to Typst:", e.message);
        return latex; // Return original on failure
    }
}

function convertHtmlToTypst(element: Element): string {
    const clone = element.cloneNode(true) as Element;

    // Handle <var> tags -> $...$
    clone.querySelectorAll("var").forEach(v => {
        v.textContent = `$${v.textContent}$`;
    });

    // Handle <pre> tags (code blocks)
    clone.querySelectorAll("pre").forEach(p => {
        p.textContent = "\n```\n" + p.textContent + "\n```\n";
    });

    // Handle <h3>, <h4> etc -> Typst headings
    clone.querySelectorAll("h3, h4, h5").forEach(h => {
        const level = parseInt(h.tagName.substring(1));
        const prefix = "=".repeat(level);
        h.textContent = `\n${prefix} ${h.textContent}\n`;
    });

    // Handle lists
    clone.querySelectorAll("ul").forEach(ul => {
        ul.querySelectorAll("li").forEach(li => {
            li.textContent = `- ${li.textContent}\n`;
        });
    });

    // Handle <br>
    clone.querySelectorAll("br").forEach(br => {
        br.replaceWith("\n");
    });

    let text = clone.textContent || "";
    text = text.replace(/\r\n/g, "\n");
    text = text.replace(/\\\((.*?)\\\)/g, (_match, p1) => `$${convertLatexToTypst(p1)}$`);
    text = text.replace(/\\\[(.*?)\\\]/gs, (_match, p1) => `\n$ ${convertLatexToTypst(p1)} $\n`);

    return text.trim();
}

export const parseProblem = (html: string, url: string): Problem => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) {
        throw new Error("Failed to parse HTML");
    }

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
    
    const parts = langEn?.querySelectorAll("section") || [];
    const contents: ContentType[] = [];
    
    parts.forEach((part) => {
        const h3 = part.querySelector("h3");
        if (!h3) return;
        
        const sectionTitle = h3.textContent?.trim() || "";
        
        const clone = part.cloneNode(true) as Element;
        const cloneH3 = clone.querySelector("h3");
        if (cloneH3) cloneH3.remove();
        
        let typstContent = convertHtmlToTypst(clone);
        
        let iden = sectionTitle.toLowerCase().replace(/\s/g, '_');
        if (sectionTitle.toLowerCase().includes("problem statement")) iden = "statement";
        else if (sectionTitle.toLowerCase().includes("constraints")) iden = "constraints";
        else if (sectionTitle.toLowerCase().includes("input")) iden = "input";
        else if (sectionTitle.toLowerCase().includes("output")) iden = "output";
        else if (sectionTitle.toLowerCase().includes("sample input")) iden = "sample_input";
        else if (sectionTitle.toLowerCase().includes("sample output")) iden = "sample_output";
        
        contents.push({
            iden: iden,
            content: typstContent
        });
    });

    const problem_iden = url.split("/").pop() || "";

    const statement: ProblemStatement = {
        statement_source: "AtCoder",
        problem_source: "AtCoder",
        problem_iden: problem_iden,
        problem_statements: contents,
        time_limit,
        memory_limit
    };

    return {
        problem_source: "AtCoder",
        problem_iden: problem_iden,
        problem_name: title,
        problem_statement: [statement],
        creation_time: new Date().toISOString(),
        tags: []
    };
};

interface Contest {
    id: string;
    name: string;
    url: string;
}

const fetchProblemsForContest = async (contest: Contest) => {
    const contestTasksUrl = `${contest.url}/tasks`;
    console.log(`Fetching tasks for contest: ${contest.id} from ${contestTasksUrl}`);
    
    const response = await fetch(contestTasksUrl);
    if (!response.ok) {
        console.error(`Failed to fetch tasks for ${contest.id}: ${response.statusText}`);
        return;
    }
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) {
        console.error(`Failed to parse tasks page for ${contest.id}`);
        return;
    }

    const problemLinks: string[] = [];
    const tableRows = doc.querySelectorAll("#main-container .table tbody tr");
    tableRows.forEach(row => {
        const link = row.querySelector("td:nth-child(2) a");
        if (link) {
            const href = (link as Element).getAttribute("href");
            if (href) {
                problemLinks.push(new URL(href, contest.url).toString());
            }
        }
    });

    console.log(`Found ${problemLinks.length} problems for contest ${contest.id}`);

    for (const problemUrl of problemLinks) {
        try {
            const problemIden = problemUrl.split("/").pop() || "";
            if (!problemIden) continue;

            const contestDir = path.join('data', 'atcoder', 'problems', contest.id);
            const outputPath = path.join(contestDir, `${problemIden}.json`);

            try {
                await Deno.stat(outputPath);
                console.log(`  Skipping ${problemIden}, file already exists.`);
                continue;
            } catch (e) {
                if (!(e instanceof Deno.errors.NotFound)) {
                    throw e; // re-throw other errors
                }
                // File does not exist, proceed.
            }

            console.log(`  Fetching problem: ${problemUrl}`);
            const problemResponse = await fetch(problemUrl);
            if (!problemResponse.ok) {
                console.error(`  Failed to fetch problem ${problemUrl}: ${problemResponse.statusText}`);
                continue;
            }
            const problemHtml = await problemResponse.text();
            const problem = await parse(problemHtml, problemUrl);

            await fs.ensureDir(contestDir);
            
            await Deno.writeTextFile(outputPath, JSON.stringify(problem, null, 2));
            console.log(`  Successfully saved ${problem.problem_iden}.json`);

            // Be nice to the server
            await new Promise(resolve => setTimeout(resolve, 500));
        } catch (error) {
            console.error(`  Error processing problem ${problemUrl}:`, error);
        }
    }
};

const main = async () => {
    const contestsPath = path.join('data', 'atcoder_contests.json');
    const contestsContent = await Deno.readTextFile(contestsPath);
    const contests: Contest[] = JSON.parse(contestsContent);

    for (const contest of contests) {
        // Skip heuristic contests for now, as they have a different structure
        if (contest.id.startsWith('ahc')) {
            console.log(`Skipping heuristic contest: ${contest.id}`);
            continue;
        }
        await fetchProblemsForContest(contest);
    }
};

main();