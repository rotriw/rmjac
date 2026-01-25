import fs from "node:fs";
import process from "node:process";
import path from "node:path";
import Progress from "progress";
import { parse } from "../vjudge_services/codeforces/parse.ts";
import { Problem } from "../declare/problem.ts";

const pathd = process.env.WHERE;

const HTML_DIR = `./data/codeforces/${pathd}/html`;
const OUTPUT_DIR = `./data/codeforces/${pathd}/parsed`;
const FAILED_FILE = `./data/codeforces/${pathd}/failed.jsonl`;
const PROCESSED_FILE = `./data/codeforces/${pathd}/processed.txt`;
const CONCURRENT_LIMIT = 5;

// 读取已处理的文件列表
function loadProcessedFiles(): Set<string> {
    const processed = new Set<string>();
    if (fs.existsSync(PROCESSED_FILE)) {
        const content = fs.readFileSync(PROCESSED_FILE, "utf-8");
        content.split("\n").forEach(line => {
            if (line.trim()) {
                processed.add(line.trim());
            }
        });
    }
    return processed;
}

// 保存已处理的文件
function saveProcessedFile(filename: string) {
    fs.appendFileSync(PROCESSED_FILE, filename + "\n");
}

// 保存失败的HTML
function saveFailedHtml(htmlContent: string, filename: string, htmlIndex: number, error: string) {
    const failedEntry = {
        filename,
        htmlIndex,
        error,
        htmlPreview: htmlContent.substring(0, 500)
    };
    fs.appendFileSync(FAILED_FILE, JSON.stringify(failedEntry) + "\n");
}

// 获取所有待处理的HTML文件
function getHtmlFiles(): string[] {
    const files: string[] = [];
    if (!fs.existsSync(HTML_DIR)) {
        console.error(`目录不存在: ${HTML_DIR}`);
        return files;
    }
    
    const items = fs.readdirSync(HTML_DIR);
    for (const item of items) {
        if (item.endsWith(".txt")) {
            files.push(path.join(HTML_DIR, item));
        }
    }
    return files.sort((a, b) => {
        const numA = parseInt(path.basename(a).match(/\d+/)?.[0] || "0");
        const numB = parseInt(path.basename(b).match(/\d+/)?.[0] || "0");
        return numA - numB;
    });
}

// 处理单个HTML文件
async function processHtmlFile(
    filePath: string,
    processedSet: Set<string>,
    bar: Progress
): Promise<{ success: number; failed: number }> {
    const filename = path.basename(filePath);
    
    // 检查是否已处理
    if (processedSet.has(filename)) {
        bar.tick(1, { token1: `跳过 ${filename}` });
        return { success: 0, failed: 0 };
    }

    const content = fs.readFileSync(filePath, "utf-8");
    const htmlContents = content.split("====HTML====");
    
    // 为每个输入文件创建对应的输出文件
    const outputFilename = filename.replace(".txt", ".jsonl");
    const outputPath = path.join(OUTPUT_DIR, outputFilename);
    
    // 确保输出目录存在
    if (!fs.existsSync(OUTPUT_DIR)) {
        fs.mkdirSync(OUTPUT_DIR, { recursive: true });
    }
    
    let successCount = 0;
    let failedCount = 0;
    const results: string[] = [];
    
    for (let i = 0; i < htmlContents.length; i++) {
        const html = htmlContents[i].trim();
        if (!html) continue;
        
        try {
            // 生成一个虚拟的URL用于解析
            const result = await parse(html, "");
            
            if (result === "") {
                // 解析失败
                saveFailedHtml(html, filename, i, "parse returned empty");
                failedCount++;
            } else {
                // 解析成功，每行一个JSON
                results.push(JSON.stringify(result));
                successCount++;
            }
        } catch (e) {
            const errorMsg = e instanceof Error ? e.message : String(e);
            saveFailedHtml(html, filename, i, errorMsg);
            failedCount++;
        }
    }
    
    // 写入结果文件
    if (results.length > 0) {
        fs.writeFileSync(outputPath, results.join("\n") + "\n");
    }
    
    // 标记为已处理
    saveProcessedFile(filename);
    processedSet.add(filename);
    
    bar.tick(1, { token1: `${filename}: ${successCount}成功, ${failedCount}失败` });
    
    return { success: successCount, failed: failedCount };
}

async function main() {
    console.log("开始处理Codeforces HTML文件...");
    
    const processedSet = loadProcessedFiles();
    console.log(`已处理文件数: ${processedSet.size}`);
    
    const files = getHtmlFiles();
    console.log(`待处理文件数: ${files.length}`);
    
    if (files.length === 0) {
        console.log("没有需要处理的文件");
        return;
    }
    
    // 清空之前的失败记录（如果需要重新处理）
    // fs.writeFileSync(FAILED_FILE, "");
    
    const bar = new Progress(':bar :current/:total :etas :token1', { 
        total: files.length, 
        width: 40 
    });
    
    let totalSuccess = 0;
    let totalFailed = 0;
    
    // 按批次处理文件
    for (let i = 0; i < files.length; i += CONCURRENT_LIMIT) {
        const batch = files.slice(i, i + CONCURRENT_LIMIT);
        const results = await Promise.all(
            batch.map(file => processHtmlFile(file, processedSet, bar))
        );
        
        for (const result of results) {
            totalSuccess += result.success;
            totalFailed += result.failed;
        }
    }
    
    console.log("\n处理完成:");
    console.log(`  成功解析: ${totalSuccess}`);
    console.log(`  解析失败: ${totalFailed}`);
    console.log(`  输出目录: ${OUTPUT_DIR}`);
    if (totalFailed > 0) {
        console.log(`  失败记录: ${FAILED_FILE}`);
    }
}

main().catch(console.error);