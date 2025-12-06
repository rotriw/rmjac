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

// 2. 定义嵌入数据结构
interface EmbeddingData {
  problemId: string;
  name: string;
  embedding: number[];
}

// 3. 定义输入文件路径
const embeddingsFilePath = "./data/codeforces/embeddings_formal.jsonl";

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