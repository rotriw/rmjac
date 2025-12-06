import OpenAI from "openai";
import fs from "node:fs";
import Progress from "progress";
import { z } from "zod";

// 1. 从环境变量中获取 API Key 和 Base URL
const apiKey = process.env.ONEAPI_KEY;
const baseurl = process.env.ONEAPI_BASEURL;

if (!apiKey) {
  console.error("错误：未设置 ONEAPI_KEY 环境变量。");
  process.exit(1);
}

// 2. 定义问题数据的 Zod schema
const problemSchema = z.object({
  problem_iden: z.string(),
  problem_name: z.string(),
  formal_statement: z.string(),
});

// 3. 定义输入和输出文件路径
const inputFilePath = "./data/codeforces/problem_b_2_formal.txt";
const outputFilePath = "./data/codeforces/embeddings_formal.jsonl";

// 4. 读取并解析数据文件
let lines: string[];
try {
  const fileContent = fs.readFileSync(inputFilePath, "utf-8");
  lines = fileContent.split("\n").filter((line) => line.trim() !== "");
} catch (error) {
  console.error(`读取文件 ${inputFilePath} 时出错:`, error);
  process.exit(1);
}

// 5. 初始化 OpenAI 客户端
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: baseurl || "https://oneapi.wanghu.rcfortress.site:8443/v1",
});

// 6. 初始化进度条和已处理问题集合
const bar = new Progress("[:bar] :current/:total :percent :etas", {
  total: lines.length,
  width: 40,
});

const processedProblems = new Set<string>();

// 如果输出文件已存在，加载已处理的问题 ID
if (fs.existsSync(outputFilePath)) {
  const existingLines = fs.readFileSync(outputFilePath, "utf-8").split("\n");
  for (const line of existingLines) {
    if (line.trim()) {
      try {
        const data = JSON.parse(line);
        if (data.problemId) {
          processedProblems.add(data.problemId);
        }
      } catch (e) {
        console.warn("无法解析输出文件中的行:", line);
      }
    }
  }
  console.log(`已加载 ${processedProblems.size} 个已处理的问题。`);
}

async function main() {
  // 更新进度条的初始状态
  bar.tick(processedProblems.size);

  for (const line of lines) {
    let problem: z.infer<typeof problemSchema>;
    try {
      const jsonData = JSON.parse(line);
      problem = problemSchema.parse(jsonData);
    } catch (error) {
      console.error("\n解析行时出错:", line, error);
      bar.tick();
      continue;
    }

    const problemId = problem.problem_iden;

    if (processedProblems.has(problemId)) {
      continue; // 跳过已处理的问题
    }

    const inputText = `Problem: ${problem.problem_name}\n${problem.formal_statement}`;

    try {
      const response = await client.embeddings.create({
        model: "bge-m3",
        input: inputText,
        encoding_format: "float",
      });

      const embedding = response.data[0].embedding;

      const result = {
        problemId: problemId,
        name: problem.problem_name,
        embedding: embedding,

      };

      fs.appendFileSync(outputFilePath, JSON.stringify(result) + "\n");
      processedProblems.add(problemId);
    } catch (error) {
      console.error(`\n处理问题 ${problemId} 时出错:`, error);
    }
    bar.tick();
  }
  console.log("\nEmbedding 生成完成。");
}

main();