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

const prompt = `You only need to simplied the problem.
MAKE STATEMENT EASILY AS YOU CAN.
DONT THINK HOW TO SOLVE PROBLEM, PRINT FAST AND ONLY PRINT ENGLISH VERSION NEW STATEMENT.MAKE NEW STATEMENT EASILY AS YOU CAN.
**Example**

**Input 1**

你知道火星人使用 $k$ 进制的数字系统。数字 $b$（$0 \leq b < k$）被认为是幸运数字，因为火星人与地球人的首次接触发生在火星纪年 $b$ 年。

一个数 $x$ 的数字根 $d(x)$ 是一个一位数，得到方法是将 $x$ 的所有数字递归相加。这里的“递归”指的是：如果第一次相加的结果不是一位数，则将结果的所有数字继续相加，如此反复，直到得到一个一位数为止。

例如，$d(3504_{7})=d((3+5+0+4)_{7})=d(15_{7})=d((1+5)_{7})=d(6_{7})=6_{7}$。在这个例子中，所有计算均在 $7$ 进制下进行。

如果一个数的数字根等于 $b$，火星人也称这个数为“幸运数字”。

你有一个长度为 $n$ 的字符串 $s$，其中每个字符是 $k$ 进制的一位数字。你的任务是计算，有多少个不同的子串是幸运数字。数字前导零是允许的。

注意：字符串 $s[i...j]$ 表示字符串 $s=a_1a_2...a_n$ 的从第 $i$ 个到第 $j$ 个子串（$1 \leq i \leq j \leq n$），也就是 $a_ia_{i+1}...a_j$。如果 $i_1 \neq i_2$ 或 $j_1 \neq j_2$，则 $s[i_1...j_1]$ 和 $s[i_2...j_2]$ 被认为是不同的子串。

**Output 1**

The numeric root of a number is defined as the one-digit number obtained by adding up all the digits in base k and repeating this process several times. If the root of a number is b, then this number is very lucky. Given a string of numbers, ask how many consecutive strings make up a number that is lucky

**Input 2**


输入两个整数 $a, b$，输出它们的和（$|a|,|b| \le {10}^9$）。

注意
1. Pascal 使用 integer 会爆掉哦！
2. 有负数哦！
好吧，同志们，我们就从这一题开始，向着大牛的路进发。
> 任何一个伟大的思想，都有一个微不足道的开始。

**Output 2**

give you two numbers, add two numbers and print answer.


输入是typst格式。
MAKE STATEMENT EASILY AS YOU CAN.
DONT THINK TOO MANY, PRINT FAST AND ONLY PRINT ENGLISH VERSION ANSWER.`;

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
    const outputFile = path.join(dir, `${filename}_simple.json`);

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

        const simpleContent = response.choices[0].message?.content || "";

        const outputObj = {
            problem_iden: json.problem_iden,
            problem_name: json.problem_name,
            simple_statement: simpleContent
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