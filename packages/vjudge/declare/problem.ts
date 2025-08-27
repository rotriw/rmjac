export interface ContentType {
    iden: string;
    content: string;
}

export interface ProblemStatement {
    statement_source: string; // 题面 来自的题库
    problem_source: string;
    problem_iden: string;
    problem_statements: ContentType[];
    time_limit: number; // 时间限制，单位 ms
    memory_limit: number; // 内存限制，单位 KB
}

export interface Problem {
    problem_source: string; // 题库来源
    problem_iden: string; // 题目来源标识符
    problem_name: string; // 题目名称
    problem_statement: ProblemStatement[]; // 题目描述
    creation_time: string; // 题目创建时间
    tags: string[]; // 输入描述
}

export class ProblemRouter {
    async save_problem(url: string): Promise<Problem | ""> {
        return "";
    }
    
}