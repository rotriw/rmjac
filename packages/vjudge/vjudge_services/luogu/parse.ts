import { Problem, ProblemStatement, ContentType } from "../../declare/problem.ts";
import TurndownService from "turndown";
import { markdownToTypstCode } from "@mdpdf/mdpdf";
import { convertTex2Typst } from "../../utils/texToTypst.ts";

/**
 * 洛谷题目数据解析
 * 洛谷 API 返回的是 JSON 格式的题目数据
 */

interface LuoguProblemData {
    currentData: {
        problem: {
            pid: string;
            title: string;
            difficulty: number;
            totalSubmit: number;
            totalAccepted: number;
            background?: string;
            description: string;
            inputFormat: string;
            outputFormat: string;
            samples: Array<[string, string]>;
            hint?: string;
            limits?: {
                time: number[];
                memory: number[];
            };
            tags?: number[];
        };
    };
}

// 洛谷难度映射
const LuoguDifficultyMap: Record<number, string> = {
    0: "暂无评定",
    1: "入门",
    2: "普及-",
    3: "普及/提高-",
    4: "普及+/提高",
    5: "提高+/省选-",
    6: "省选/NOI-",
    7: "NOI/NOI+/CTSC",
};

/**
 * 将洛谷的 Markdown 内容转换为 Typst 格式
 */
async function convertMarkdownToTypst(markdown: string): Promise<string> {
    if (!markdown || markdown.trim() === "") {
        return "";
    }

    // 处理洛谷特有的 LaTeX 数学公式标记
    // 洛谷使用 $...$ 和 $$...$$ 作为数学公式标记
    let processed = markdown;
    
    // 将 LaTeX 公式转换为 Typst 格式
    // 行内公式 $...$
    processed = processed.replace(/\$([^$\n]+?)\$/g, (_match, formula) => {
        try {
            const typstFormula = convertTex2Typst(formula);
            return `$${typstFormula}$`;
        } catch {
            return `$${formula}$`;
        }
    });

    // 行间公式 $$...$$
    processed = processed.replace(/\$\$([^$]+?)\$\$/g, (_match, formula) => {
        try {
            const typstFormula = convertTex2Typst(formula);
            return `$ ${typstFormula} $`;
        } catch {
            return `$ ${formula} $`;
        }
    });

    try {
        // 使用 Turndown 将 HTML 部分转换为 Markdown
        const turndownService = new TurndownService();
        
        // 处理代码块
        turndownService.addRule("codeBlock", {
            filter: ["pre", "code"],
            replacement: function (content: string, node: any) {
                if (node.nodeName === "PRE") {
                    return "```\n" + content + "\n```";
                }
                return "`" + content + "`";
            },
        });

        // 尝试转换为 Typst
        const typstCode = await markdownToTypstCode(processed);
        
        // 清理不需要的头部设置
        const lines = typstCode.split("\n").filter(
            (line) =>
                !line.startsWith("#set ") &&
                !line.startsWith("#let ") &&
                !line.startsWith("#show") &&
                line.replaceAll(" ", "").length > 0
        );
        
        return lines.join("\n");
    } catch {
        // 如果转换失败，返回原始内容
        return processed;
    }
}

/**
 * 解析洛谷 API 返回的 JSON 数据
 */
export async function parse(
    data: LuoguProblemData | string,
    url: string
): Promise<Problem | ""> {
    try {
        // 如果是字符串，尝试解析为 JSON
        const jsonData: LuoguProblemData = typeof data === "string" ? JSON.parse(data) : data;
        
        const problem = jsonData.currentData?.problem;
        if (!problem) {
            console.error("No problem data found in response");
            return "";
        }

        const problemIden = problem.pid;
        const problemName = problem.title;
        
        // 获取时间和内存限制
        const timeLimit = problem.limits?.time?.[0] || 1000; // 默认 1000ms
        const memoryLimit = (problem.limits?.memory?.[0] || 256) / 1024; // 转换为 KB
        
        // 构建题目内容
        const problemStatements: ContentType[] = [];
        
        // 题目背景
        if (problem.background) {
            problemStatements.push({
                iden: "background",
                content: await convertMarkdownToTypst(problem.background),
            });
        }
        
        // 题目描述
        if (problem.description) {
            problemStatements.push({
                iden: "statement",
                content: await convertMarkdownToTypst(problem.description),
            });
        }
        
        // 输入格式
        if (problem.inputFormat) {
            problemStatements.push({
                iden: "input",
                content: await convertMarkdownToTypst(problem.inputFormat),
            });
        }
        
        // 输出格式
        if (problem.outputFormat) {
            problemStatements.push({
                iden: "output",
                content: await convertMarkdownToTypst(problem.outputFormat),
            });
        }
        
        // 说明/提示
        if (problem.hint) {
            problemStatements.push({
                iden: "note",
                content: await convertMarkdownToTypst(problem.hint),
            });
        }

        // 样例数据
        const sampleGroup: [string, string][] = problem.samples || [];

        // 构建原始页面内容用于备用渲染
        const pageSource = JSON.stringify(jsonData);

        // 难度
        const difficulty = problem.difficulty || null;

        const statement: ProblemStatement = {
            statement_source: "luogu",
            problem_source: "luogu",
            page_source: pageSource,
            iden: problemIden,
            problem_statements: problemStatements,
            time_limit: timeLimit,
            memory_limit: memoryLimit * 1024, // 转换回 KB
            sample_group: sampleGroup,
            show_order: ["default_luogu"],
            problem_difficulty: difficulty,
            page_rendered: null,
            judge_option: {
                p_id: problemIden,
            },
        };

        return {
            problem_iden: `RmjLG${problemIden}`,
            problem_name: problemName,
            problem_statement: [statement],
            creation_time: new Date().toISOString(),
            tags: [],
            user_id: 1,
        };
    } catch (error) {
        console.error("Error parsing luogu problem data:", error);
        return "";
    }
}

/**
 * 从 URL 中提取题目 ID
 */
export function extractProblemId(url: string): string {
    try {
        const parsed = new URL(url);
        const parts = parsed.pathname.split("/").filter(Boolean);
        const problemIndex = parts.indexOf("problem");
        if (problemIndex >= 0 && parts.length > problemIndex + 1) {
            return parts[problemIndex + 1];
        }
        return "";
    } catch {
        return "";
    }
}
