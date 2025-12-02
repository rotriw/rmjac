import OpenAI from "openai";
import fs from "node:fs";
import Progress from "progress";

const apiKey = process.env.ONEAPI_KEY;
const baseurl = process.env.ONEAPI_BASEURL;

const filePath = process.argv[2] || "./data/codeforces/problem_b_2.txt";
const dataList = fs.readFileSync(filePath, "utf-8").split("\n");
const bar = new Progress(':bar :current :etas :token1 :percent', {total: dataList.length, width: 40});


const client = new OpenAI({
    apiKey: apiKey,
    baseURL: baseurl || "https://oneapi.wanghu.rcfortress.site:8443/v1"
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

const pathf = "./data/codeforces/problem_b_2_translate.txt";
const faileds: number[] = [];
const isExist = {}, inUse = {};
const files = fs.readFileSync(pathf).toString().split("\n");
for (let file of files) {
    if (file.trim().length === 0) continue;
    let obj = JSON.parse(file);
    isExist[obj.problem_name] = true;
    bar.tick();
    // console.log(`Loaded existing problem: ${obj.problem_name}`);
}

let tcnt = 0;

async function handle(l: number, r: number) {
    for (let i = l; i <= r; i ++ ) {
        // console.log(`Start to handle ${i}`);
        let data = dataList[i]; try {if (JSON.parse(data).length === 0) {
            continue;
        }} catch (e) {
            continue;
        }
        if (inUse[i]) {
            continue;
        }
        inUse[i] = true;
        try {
            let result = JSON.parse(data);
            if (isExist[result.problem_name]) {
                continue;
            }
            const response = await client.chat.completions.create({
                model: "qwen/qwen3-next-80b-a3b-instruct",
                messages: [
                    { role: "system", content:  prompt},
                    { role: "user",  content: JSON.stringify( result.problem_statement[0]) }
            ]});
            let ndata = response.choices[0].message?.content || "";
            let response_obj = {
                problem_iden: result.problem_iden,
                problem_name: result.problem_name,
                formal_statement: ndata
            };
            fs.appendFileSync(pathf, JSON.stringify(response_obj));
            fs.appendFileSync(pathf, "\n");
            bar.tick(1, {
                'token1': `${i} done.`
            });
            isExist[result.problem_name] = true;
        } catch (e) {
            console.log(`Error at index ${i}:`, e);
            faileds.push(i);
        }
    }
    if (faileds.length) {
        console.log("Failed indices:", faileds);
        fs.appendFileSync("./data/codeforces/problem_b_2_failed_translate.txt", JSON.stringify(faileds));
    }
}



let l = 0, r = 0;

const now_process = 0;


console.log(dataList.length);
for (let i = 1; i <= 25; i ++) {
    handle(0, dataList.length - 1);
}

console.log("done");