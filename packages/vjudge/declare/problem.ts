export interface ContentType {
    iden: string;
    content: string;
}

export interface ProblemStatement {
    statement_source: string; // 题面 来自的题库
    problem_source: string; // 题库来源
    page_source: string; // 题目源代码
    iden: string; // 题目来源标识符
    problem_statements: ContentType[]; // 题目描述
    time_limit: number; // 时间限制，单位 ms
    memory_limit: number; // 内存限制，单位 KB
    sample_group: [string, string][]; // 样例 [输入, 输出]
    show_order: string[]; // 题目显示顺序
    problem_difficulty: number | null; // 题目难度
    page_rendered: string | null; // 题目渲染后的 HTML 内容
}

export interface Problem {
    // problem_source: string; // 题库来源
    problem_iden: string; // 题目来源标识符
    problem_name: string; // 题目名称
    problem_statement: ProblemStatement[]; // 题目描述
    creation_time: string; // 题目创建时间
    tags: string[]; // 输入描述
    user_id: number; // 题目创建者
}