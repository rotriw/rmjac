
export interface UniversalSubmission {
    remote_id: string; // 远程提交ID
    remote_platform: string; // 远程平台
    remote_problem_id: string; // 远程题目ID
    language: string; // 语言
    code: string; // 代码
    status: string; // 状态
    message: string; // 消息
    score: number; // 分数
    submit_time: string; // 提交时间
    url: string; // 提交URL
    passed: [string, string, number, number, number][]; // 测试点情况 [测试点名称, 测试状态, 测试点得分, 测试点内存, 测试点时间]
}