import OpenAI from "openai";
import fs from "node:fs";
import path from "node:path";
import Progress from "progress";

const apiKey = process.env.ONEAPI_KEY;
const baseurl = process.env.ONEAPI_BASEURL;

const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseurl || "https://oneapi.wanghu.rcfortress.site:8443/v1",
    timeout: 60 * 1000, // Increased timeout
});

const prompt = `你是一位专业的编程竞赛题面本地化工程师，擅长将英文算法题精准翻译为中文，同时严格保持技术细节的完整性。请将输入的 JSON 数组中的每个对象的 content 字段翻译为中文，要求如下： 
仅翻译自然语言部分，所有数学公式（位于 $...$ 内）、Typst 命令（如 lt.eq, dots.h, _..._ 下划线强调）必须原样保留，不得改动、转义或美化；
术语规范：
alternating sum → “交错和”
test case → “测试用例”（非“测试案例”或“样例”）
sequence → “序列”
output / input → “输出” / “输入”（动词时用“请输出”“给定”等符合中文题面习惯的表达）
保持段落结构、换行符 \n 与原 content 一致；
输出必须是合法、格式完整的 JSON 数组，与输入结构严格一致（字段名 iden, content 不变）；
禁止添加任何解释、注释、额外字段或 Markdown 格式。
请直接输出翻译后的 JSON 数组，不要包含任何其他文字。`;

const rootDir = "./data/atcoder/problems";
const CONCURRENT_LIMIT = 10; // Process 3 files concurrently

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
    const outputFile = path.join(dir, `${filename}_translate.json`);

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

        const response = await client.chat.completions.create({
            model: "qwen/qwen3-next-80b-a3b-instruct",
            messages: [
                { role: "system", content: prompt },
                { role: "user", content: JSON.stringify(statements) }
            ]
        });

        const translatedContent = response.choices[0].message?.content || "";

        const outputObj = {
            problem_iden: json.problem_iden,
            problem_name: json.problem_name,
            translated_response: translatedContent
        };

        fs.writeFileSync(outputFile, JSON.stringify(outputObj, null, 2));
        bar.tick(1, { token1: `Translated ${filename}` });

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