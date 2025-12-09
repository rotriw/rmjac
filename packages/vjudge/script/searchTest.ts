import OpenAI from "openai";
import fs from "node:fs";
import readline from "node:readline";

// 1. 从环境变量中获取 API Key 和 Base URL
const apiKey = process.env.ONEAPI_KEY;
const baseurl = process.env.ONEAPI_BASEURL;

if (!apiKey) {
  console.error("错误：未设置 ONEAPI_KEY 环境变量。");
  process.exit(1);
}

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


const prompt2 = ``;

// 2. 定义嵌入数据结构
interface EmbeddingData {
  problemId: string;
  name: string;
  embedding: number[];
}

// 3. 定义输入文件路径
const embeddingsFilePath = "./data/codeforces/embeddings_2_formal.jsonl";

// 4. 初始化 OpenAI 客户端
const client = new OpenAI({
  apiKey: apiKey,
  baseURL: baseurl || "https://oneapi.wanghu.rcfortress.site:8443/v1",
});

const client2 = new OpenAI({
    apiKey: apiKey,
    baseURL: baseurl || "https://oneapi.wanghu.rcfortress.site:8443/v1",
});


/**
 * 使用 AI 模型简化问题描述
 * @param statement 原始问题描述
 * @returns 简化后的问题描述
 */
async function aiToSimple(statement: string): Promise<string> {
  try {
    const response = await client.chat.completions.create({
      model: "qwen/qwen3-next-80b-a3b-instruct",
      messages: [
        {
          role: "system",
          content: prompt},
        {
          role: "user",
          content: statement,
        },
      ],
    });
    return response.choices[0].message.content || "";
  } catch (error) {
    console.error("简化问题时出错:", error);
    return ""; // 返回空字符串表示失败
  }
}

/**
 * 将文本向量化
 * @param text 输入文本
 * @returns 向量
 */
async function getEmbedding(text: string): Promise<number[]> {
  const response = await client2.embeddings.create({
    model: "bge-m3",
    input: text,
    encoding_format: "float",
  });
  console.log(response);
  return response.data[0].embedding;
}

/**
 * 计算两个向量的余弦相似度
 * @param vecA 向量A
 * @param vecB 向量B
 * @returns 余弦相似度
 */
function cosineSimilarity(vecA: number[], vecB: number[]): number {
  const dotProduct = vecA.reduce((sum, a, i) => sum + a * vecB[i], 0);
  const magnitudeA = Math.sqrt(vecA.reduce((sum, a) => sum + a * a, 0));
  const magnitudeB = Math.sqrt(vecB.reduce((sum, b) => sum + b * b, 0));
  if (magnitudeA === 0 || magnitudeB === 0) {
    return 0;
  }
  return dotProduct / (magnitudeA * magnitudeB);
}

/**
 * 加载嵌入数据
 * @returns 嵌入数据数组
 */
function loadEmbeddings(): EmbeddingData[] {
  console.log(`正在从 ${embeddingsFilePath} 加载 embeddings...`);
  const fileContent = fs.readFileSync(embeddingsFilePath, "utf-8");
  const lines = fileContent.split("\n").filter((line) => line.trim() !== "");
  const embeddings = lines.map((line) => JSON.parse(line) as EmbeddingData);
  console.log(`成功加载 ${embeddings.length} 条数据。`);
  return embeddings;
}

async function main() {
  const allEmbeddings = loadEmbeddings();

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  const askQuestion = () => {
    rl.question("\n请输入要搜索的题面 (输入 'exit' 退出): ", async (query) => {
      if (query.toLowerCase() === "exit") {
        rl.close();
        return;
      }

      console.log("正在简化题面...");
      const simplifiedQuery = await aiToSimple(query);
      if (!simplifiedQuery) {
        console.error("无法简化题面，请重试。");
        askQuestion();
        return;
      }
      console.log("简化后的题面:", simplifiedQuery);

      console.log("正在生成查询向量...");
      const queryEmbedding = await getEmbedding(simplifiedQuery);

      console.log("正在搜索最相似的题目...");
      const results = allEmbeddings.map((data) => ({
        problemId: data.problemId,
        name: data.name,
        similarity: cosineSimilarity(queryEmbedding, data.embedding),
      }));

      results.sort((a, b) => b.similarity - a.similarity);

      console.log("\n--- Top 10 搜索结果 ---");
      for (let i = 0; i < 10 && i < results.length; i++) {
        const result = results[i];
        console.log(
          `${(i + 1).toString().padStart(2, " ")}. [${
            result.problemId
          }] ${result.name} (相似度: ${result.similarity.toFixed(4)})`
        );
      }
      console.log("-----------------------\n");

      askQuestion();
    });
  };

  askQuestion();
}

main();