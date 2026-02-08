import axios from "axios";
import { parse } from "./parse.ts";

/**
 * 获取洛谷题目页面内容
 * 洛谷使用 _contentOnly 参数返回 JSON 格式的题目数据
 */

export const fetchProblem = async (task: { url: string }): Promise<any> => {
    const { url } = task;
    try {
        // 洛谷题目 URL 格式: https://www.luogu.com.cn/problem/P1001
        // 使用 _contentOnly=1 参数获取 JSON 格式数据
        const apiUrl = url.includes("?") ? `${url}&_contentOnly=1` : `${url}?_contentOnly=1`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "application/json",
            },
        });
        
        if (response.status !== 200) {
            console.error(`Failed to fetch ${url}: ${response.status}`);
            return "";
        }
        
        // 解析并返回题目信息
        return await parse(response.data, url);
    } catch (e) {
        console.error(`Error fetching ${url}:`, e);
        return "";
    }
};

export const any = async (url: string): Promise<string> => {
    try {
        const apiUrl = url.includes("?") ? `${url}&_contentOnly=1` : `${url}?_contentOnly=1`;
        
        const response = await axios.get(apiUrl, {
            headers: {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
            },
        });
        
        if (response.status !== 200) {
            return "";
        }
        
        return JSON.stringify(response.data);
    } catch (e) {
        console.error(`Error fetching ${url}:`, e);
        return "";
    }
};
