import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import * as fs from "https://deno.land/std@0.207.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.207.0/path/mod.ts";
import { Problem, ProblemStatement, ContentType } from "../declare/problem.ts";
// @deno-types="npm:@types/tex-to-typst"
import { texToTypst } from "npm:tex-to-typst";
import { parse } from "../vjudge_services/atcoder/parse.ts";


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

// Simple async pool to limit concurrent tasks
async function asyncPool<T>(limit: number, items: T[], worker: (item: T) => Promise<void>): Promise<void> {
    const executing = new Set<Promise<void>>();

    for (const item of items) {
        const p = (async () => {
            try {
                await worker(item);
            } finally {
                executing.delete(p);
            }
        })();

        executing.add(p);
        if (executing.size >= limit) {
            await Promise.race(executing);
        }
    }

    await Promise.all(executing);
}

const REQUEST_DELAY_MS = 500;

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Ensure each request uses a fresh connection (no keep-alive)
async function fetchWithFreshConnection(url: string): Promise<Response> {
    const client = Deno.createHttpClient({ keepAlive: false });
    try {
        const response = await fetch(url, {
            client,
            headers: {
                "Connection": "close"
            }
        });
        await sleep(REQUEST_DELAY_MS);
        return response;
    } finally {
        client.close();
    }
}

const PROBLEM_CONCURRENCY = 2;
const CONTEST_CONCURRENCY = 50;

const parseContests = (html: string): Contest[] => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) {
        return [];
    }

    const contests: Contest[] = [];

    const tables = doc.querySelectorAll('.table-responsive > table');
    
    tables.forEach(table => {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const secondTd = row.querySelector('td:nth-child(2)');
            const link = secondTd?.querySelector('a');

            if (link && (link as Element).getAttribute('href')) {
                const href = (link as Element).getAttribute('href')!;
                const url = new URL(href, 'https://atcoder.jp').toString();
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

const fetchAndSaveContests = async (contestsPath: string): Promise<Contest[]> => {
    const baseUrl = 'https://atcoder.jp/contests/archive';
    const firstPageResponse = await fetchWithFreshConnection(baseUrl);
    const firstPageHtml = await firstPageResponse.text();
    const doc = new DOMParser().parseFromString(firstPageHtml, "text/html");
    if (!doc) {
        throw new Error("Failed to parse the first contests page.");
    }

    const pageLinks = doc.querySelectorAll('.pagination li a');
    let lastPage = 1;
    pageLinks.forEach(link => {
        const pageNum = parseInt(link.textContent || '', 10);
        if (!isNaN(pageNum) && pageNum > lastPage) {
            lastPage = pageNum;
        }
    });

    console.log(`Found ${lastPage} pages of contests.`);

    let allContests: Contest[] = parseContests(firstPageHtml);

    for (let i = 2; i <= lastPage; i++) {
        console.log(`Fetching contest page ${i}...`);
        const response = await fetchWithFreshConnection(`${baseUrl}?page=${i}`);
        const html = await response.text();
        const contests = parseContests(html);
        allContests.push(...contests);
    }

    await fs.ensureDir(path.dirname(contestsPath));
    await Deno.writeTextFile(contestsPath, JSON.stringify(allContests, null, 2));
    console.log(`Saved ${allContests.length} contests to ${contestsPath}`);

    return allContests;
};

const loadContests = async (contestsPath: string): Promise<Contest[]> => {
    try {
        const contestsContent = await Deno.readTextFile(contestsPath);
        return JSON.parse(contestsContent) as Contest[];
    } catch (error) {
        if (error instanceof Deno.errors.NotFound) {
            console.log(`Local contests file not found, fetching from remote...`);
            return await fetchAndSaveContests(contestsPath);
        }
        throw error;
    }
};

const fetchProblemsForContest = async (contest: Contest) => {
    const contestTasksUrl = `${contest.url}/tasks`;
    console.log(`Fetching tasks for contest: ${contest.id} from ${contestTasksUrl}`);
    
    const response = await fetchWithFreshConnection(contestTasksUrl);
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

    const problemTasks = problemLinks.map(problemUrl => async () => {
        try {
            const problemIden = problemUrl.split("/").pop() || "";
            if (!problemIden) return;

            const contestDir = path.join('data', 'atcoder', 'problems', contest.id);
            const outputPath = path.join(contestDir, `${problemIden}.json`);

            try {
                await Deno.stat(outputPath);
                console.log(`  Skipping ${problemIden}, file already exists.`);
                return;
            } catch (e) {
                if (!(e instanceof Deno.errors.NotFound)) {
                    throw e; // re-throw other errors
                }
                // File does not exist, proceed.
            }

            console.log(`  Fetching problem: ${problemUrl}`);
            const problemResponse = await fetchWithFreshConnection(problemUrl);
            if (!problemResponse.ok) {
                console.error(`  Failed to fetch problem ${problemUrl}: ${problemResponse.statusText}`);
                return;
            }
            const problemHtml = await problemResponse.text();
            const problem = await parse(problemHtml, problemUrl);

            await fs.ensureDir(contestDir);
            
            await Deno.writeTextFile(outputPath, JSON.stringify(problem, null, 2));
            console.log(`  Successfully saved ${problem.problem_iden}.json`);

        } catch (error) {
            console.error(`  Error processing problem ${problemUrl}:`, error);
        }
    });

    await asyncPool(PROBLEM_CONCURRENCY, problemTasks, task => task());
};

const main = async () => {
    const contestsPath = path.join('data', 'atcoder_contests.json');
    const contests = await loadContests(contestsPath);

    const filteredContests = contests.filter(contest => {
        if (contest.id.startsWith('ahc')) {
            console.log(`Skipping heuristic contest: ${contest.id}`);
            return false;
        }
        return true;
    });

    const contestTasks = filteredContests.map(contest => async () => {
        await fetchProblemsForContest(contest);
    });

    await asyncPool(CONTEST_CONCURRENCY, contestTasks, task => task());
};

main();