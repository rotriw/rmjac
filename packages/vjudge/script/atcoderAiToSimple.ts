import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import Progress from "progress";

const apiKey = process.env.ONEAPI_KEY;
const baseurl = process.env.ONEAPI_BASEURL;

const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseurl || "https://oneapi.wanghu.rcfortress.site:8443/v1",
    timeout: 60 * 1000,
});

const prompt = `You are an expert Mathematical Formalizer. Your task is to translate the provided word problem or verbose problem statement into a concise, formal mathematical representation.
**Guidelines:**
1.  **Strict Formalism:** Use only standard mathematical terminology and notation (LaTeX format is preferred for symbols).
2.  **De-contextualize:** Remove all narrative, real-world scenarios, filler words, and conversational elements. Retain only the mathematical logic and constraints.
3.  **Structure:** Organize the output logically (e.g., Definitions, Given/Constraints, Objective).
4.  **Direct Output:** Do not provide explanations, thinking processes, or introductory phrases (like "Here is the formal statement"). Output **only** the mathematical formulation.

!!!YOU SHOULDN'T SOLVE THE PROBLEM LONG TIME!!!!
!!!Only print statement, and print quickly!!!
**Example**
"You are given a sequence of integers. Output the _alternating_ sum of this sequence. In other words, output $a_1 -a_2 + a_3 -a_4 + a_5 -dots.h$. That is, the signs of plus and minus alternate, starting with a plus.

The first line of the test contains one integer $t$ ($1 lt.eq t lt.eq 1000$) — the number of test cases. Then follow $t$ test cases.

The first line of each test case contains one integer $n$ ($1 lt.eq n lt.eq 50$) — the length of the sequence. The second line of the test case contains $n$ integers $a_1, a_2, dots.h, a_n$ ($1 lt.eq a_i lt.eq 100$).

Output $t$ lines. For each test case, output the required alternating sum of the numbers.

the result is

**Definitions**\nLet $t \\in \\mathbb{Z}$ be the number of test cases.\nLet $T = \\{(n_k, A_k) \\mid k \\in \\{1, \\dots, t\\}\\}$ be the set of test cases, where for each $k$:\n*   $n_k \\in \\mathbb{Z}$ denotes the length of the sequence.\n*   $A_k = (a_{k,1}, a_{k,2}, \\dots, a_{k,n_k})$ is a sequence of integers.\n\n**Constraints**\n1.  $1 \\le t \\le 1000$\n2.  For each $k \\in \\{1, \\dots, t\\}$:\n    *   $1 \\le n_k \\le 50$\n    *   $1 \\le a_{k,i} \\le 100$ for all $i \\in \\{1, \\dots, n_k\\}$\n\n**Objective**\nFor each test case $k \\in \\{1, \\dots, t\\}$, calculate the alternating sum $S_k$:\n$$ S_k = \\sum_{i=1}^{n_k} (-1)^{i-1} a_{k,i} $$

**Input Problem:**`;

const rootDir = "./data/atcoder/problems";
const CONCURRENT_LIMIT = 3; // Process 3 files concurrently

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []) {
    const files = fs.readdirSync(dirPath);

    files.forEach(function(file) {
        if (fs.statSync(dirPath + "/" + file).isDirectory()) {
            arrayOfFiles = getAllFiles(dirPath + "/" + file, arrayOfFiles);
        } else {
            if (file.endsWith(".json") && !file.includes("_translate") && !file.includes("_simple") && !file.includes("_formal")) {
                arrayOfFiles.push(path.join(dirPath, file));
            }
        }
    });

    return arrayOfFiles;
}

async function processFile(file: string, bar: Progress) {
    const dir = path.dirname(file);
    const filename = path.basename(file, ".json");
    const outputFile = path.join(dir, `${filename}_formal.json`);

    if (fs.existsSync(outputFile)) {
        bar.tick(1, { token1: `Skipping ${filename}` });
        return;
    }

    try {
        const content = fs.readFileSync(file, "utf-8");
        const json = JSON.parse(content);
        
        if (!json.problem_statement || !json.problem_statement[0] || !json.problem_statement[0].problem_statements) {
            bar.tick(1, { token1: `Invalid format ${filename}` });
            return;
        }

        const statements = json.problem_statement[0].problem_statements;
        let problemStatementContent = "";
        
        for (const stmt of statements) {
            if (stmt.iden.toLowerCase().includes("statement")) {
                problemStatementContent += stmt.content + "\n";
            }
        }

        if (!problemStatementContent) {
             bar.tick(1, { token1: `No statement found ${filename}` });
             return;
        }

        const response = await client.chat.completions.create({
            model: "qwen/qwen3-next-80b-a3b-instruct",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: problemStatementContent }
            ]
        });

        const formalContent = response.choices[0].message?.content || "";

        const outputObj = {
            problem_iden: json.problem_iden,
            problem_name: json.problem_name,
            formal_statement: formalContent
        };

        fs.writeFileSync(outputFile, JSON.stringify(outputObj, null, 2));
        bar.tick(1, { token1: `Processed ${filename}` });

    } catch (e) {
        console.error(`Error processing ${filename}:`, e);
        bar.tick(1, { token1: `Error ${filename}` });
    }
}

async function main() {
    const files = getAllFiles(rootDir);
    const bar = new Progress(':bar :current/:total :etas :token1', { total: files.length, width: 40 });

    // Process files in batches
    for (let i = 0; i < files.length; i += CONCURRENT_LIMIT) {
        const batch = files.slice(i, i + CONCURRENT_LIMIT);
        await Promise.all(batch.map(file => processFile(file, bar)));
    }
}

main();