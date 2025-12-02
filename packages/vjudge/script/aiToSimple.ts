import OpenAI from "openai";
import fs from "node:fs";
import Progress from "progress";

const apiKey = process.env.ONEAPI_KEY;
const baseurl = process.env.ONEAPI_BASEURL;

const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseurl || "https://oneapi.wanghu.rcfortress.site:8443/v1",
    timeout: 20 * 1000,
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


const pathf = "./data/codeforces/problem_b_2_formal.txt";

const faileds: number[] = [];

const isExist = {};
const isUse = {};

const filePath = process.argv[2] || "./data/codeforces/problem_b_2.txt";
const dataList = fs.readFileSync(filePath, "utf-8").split("\n");
const bar = new Progress(':bar :current :etas :token1 :percent', {total: dataList.length, width: 40});

const files = fs.readFileSync(pathf).toString().split("\n");
for (let file of files) {
    if (file.trim().length === 0) continue;
    let obj = JSON.parse(file);
    isExist[obj.problem_name] = true;
    bar.tick(1, {
        'token1': `${obj.problem_name}`
    });
    // console.log(`Loaded existing problem: ${obj.problem_name}`);
}

async function handle(l: number, r: number) {
    for (let i = l; i <= r; i ++ ) {
        // console.log(`Start to handle ${i}`);
        let data = dataList[i]; try {if (JSON.parse(data).length === 0) {
            continue;
        }} catch (e) {
            continue;
        }
        try {
            let result = JSON.parse(data);
            if (isUse[result.problem_name]) {
                continue;
            }
            if (isExist[result.problem_name]) {
                continue;
            }
            isUse[result.problem_name] = true;
            for (let rstatement of result.problem_statement[0].problem_statements) {
                if (rstatement.iden === "statement") {
                    // console.log(rstatement.content);
                    const response = await client.chat.completions.create({
                        model: "qwen/qwen3-next-80b-a3b-instruct",
                        messages: [
                            { role: "system", content:  prompt},
                            { role: "user", content: rstatement.content }
                    ]});
                    let data = response.choices[0].message?.content || "";
                    let response_obj = {
                        problem_iden: result.problem_iden,
                        problem_name: result.problem_name,
                        formal_statement: data
                    };
                    fs.appendFileSync(pathf, JSON.stringify(response_obj));
                    fs.appendFileSync(pathf, "\n");
                    bar.tick(1, {
                        'token1': `${i} done.`
                    });
                    // console.log(`${i} done.`);
                    break;
                }
            }
            isExist[result.problem_name] = true;
        } catch (e) {
            console.log(`Error at index ${i}:`, e);
            faileds.push(i);
        }
    }
    console.log("Failed indices:", faileds);
    fs.appendFileSync("./data/codeforces/problem_b_2_failed_formal.txt", JSON.stringify(faileds));

}



let l = 0, r = 0;

const now_process = 0;



console.log(dataList.length);
for (let i = 1; i <= 10; i ++) {
    handle(0, dataList.length - 1);
}

console.log("done");