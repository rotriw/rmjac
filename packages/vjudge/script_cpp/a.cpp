#include <iostream>
#include <fstream>
#include <string>
#include <vector>
#include <algorithm>
#include <sys/stat.h>
#include <sys/types.h>

// 去除字符串两端的空白字符
std::string trim(const std::string& str) {
    size_t start = str.find_first_not_of(" \t\r\n");
    if (start == std::string::npos) return "";
    size_t end = str.find_last_not_of(" \t\r\n");
    return str.substr(start, end - start + 1);
}

// 检查一行是否是JSON（以{开头且以}结尾）
bool isJsonLine(const std::string& line) {
    std::string trimmed = trim(line);
    if (trimmed.empty()) return false;
    return trimmed.front() == '{' && trimmed.back() == '}';
}

// 检查是否以<!DOCTYPE开头（不区分大小写）
bool startsWithDoctype(const std::string& line) {
    std::string trimmed = trim(line);
    if (trimmed.length() < 9) return false;
    std::string prefix = trimmed.substr(0, 9);
    std::transform(prefix.begin(), prefix.end(), prefix.begin(), ::toupper);
    return prefix == "<!DOCTYPE";
}

// 检查是否包含</html>（不区分大小写）
bool containsHtmlEnd(const std::string& line) {
    std::string lower = line;
    std::transform(lower.begin(), lower.end(), lower.begin(), ::tolower);
    return lower.find("</html>") != std::string::npos;
}

int main(int argc, char* argv[]) {
    if (argc < 3) {
        std::cerr << "用法: " << argv[0] << " <输入文件> <输出目录>" << std::endl;
        std::cerr << "示例: " << argv[0] << " input.txt output_dir" << std::endl;
        return 1;
    }

    std::string inputFile = argv[1];
    std::string outputDir = argv[2];

    // 创建输出目录
    mkdir(outputDir.c_str(), 0755);
    
    // 创建JSON和HTML子目录
    std::string jsonDir = outputDir + "/json";
    std::string htmlDir = outputDir + "/html";
    mkdir(jsonDir.c_str(), 0755);
    mkdir(htmlDir.c_str(), 0755);

    std::ifstream inFile(inputFile);
    if (!inFile.is_open()) {
        std::cerr << "无法打开输入文件: " << inputFile << std::endl;
        return 1;
    }

    std::vector<std::string> htmlContents;  // 存储所有HTML内容单元
    std::string currentHtml;                // 当前正在累积的HTML内容
    std::string line;
    int jsonCount = 0;
    int htmlCount = 0;

    while (std::getline(inFile, line)) {
        // 检查是否是JSON行
        if (isJsonLine(line)) {
            // 如果有正在累积的HTML内容，先保存它
            if (!currentHtml.empty()) {
                htmlContents.push_back(currentHtml);
                htmlCount++;
                currentHtml.clear();
            }
            
            // 每个JSON单独保存到一个文件
            std::string jsonFile = jsonDir + "/json_" + std::to_string(jsonCount) + ".json";
            std::ofstream outJson(jsonFile);
            if (outJson.is_open()) {
                outJson << line << std::endl;
                outJson.close();
                std::cout << "已写入JSON文件: " << jsonFile << std::endl;
            } else {
                std::cerr << "无法创建JSON文件: " << jsonFile << std::endl;
            }
            jsonCount++;
        } else {
            // HTML内容
            // 检查是否是新的HTML文档开始（<!DOCTYPE）
            if (startsWithDoctype(line)) {
                // 如果有正在累积的HTML内容，先保存它
                if (!currentHtml.empty()) {
                    htmlContents.push_back(currentHtml);
                    htmlCount++;
                    currentHtml.clear();
                }
            }
            
            // 累积HTML内容
            if (!currentHtml.empty()) {
                currentHtml += "\n";
            }
            currentHtml += line;
            
            // 检查是否是HTML结束
            if (containsHtmlEnd(line)) {
                htmlContents.push_back(currentHtml);
                htmlCount++;
                currentHtml.clear();
            }
        }
    }

    // 处理最后剩余的HTML内容
    if (!currentHtml.empty()) {
        htmlContents.push_back(currentHtml);
        htmlCount++;
    }

    inFile.close();

    std::cout << "\n解析完成:" << std::endl;
    std::cout << "  JSON数量: " << jsonCount << std::endl;
    std::cout << "  HTML数量: " << htmlContents.size() << std::endl;

    // 按每100个HTML内容单元写入一个文件
    const int BATCH_SIZE = 100;
    int fileIndex = 0;
    
    for (size_t i = 0; i < htmlContents.size(); i += BATCH_SIZE) {
        std::string outputFile = htmlDir + "/html_" + std::to_string(fileIndex) + ".txt";
        std::ofstream outFile(outputFile);
        
        if (!outFile.is_open()) {
            std::cerr << "无法创建输出文件: " << outputFile << std::endl;
            return 1;
        }

        size_t end = std::min(i + BATCH_SIZE, htmlContents.size());
        for (size_t j = i; j < end; j++) {
            if (j > i) {
                outFile << "====HTML====" << std::endl;
            }
            outFile << htmlContents[j] << std::endl;
        }

        outFile.close();
        std::cout << "已写入HTML文件: " << outputFile << " (包含 " << (end - i) << " 个HTML单元)" << std::endl;
        fileIndex++;
    }

    std::cout << "\n处理完成:" << std::endl;
    std::cout << "  JSON文件数: " << jsonCount << " (保存在 " << jsonDir << ")" << std::endl;
    std::cout << "  HTML文件数: " << fileIndex << " (保存在 " << htmlDir << ")" << std::endl;

    return 0;
}