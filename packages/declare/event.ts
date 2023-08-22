import { ProblemScore } from './score';

export interface EventProblem {
    psid: string; // problem/{psid}
    hint: string;
    title: string;
    score?: ProblemScore;
}

/*
* Standard Format / Universal Format.
* 标准格式 / 全局传输格式
* */
export interface EventTask {
    id: string; // Event task id
    title: string; // Event string
    description: string; // Event description.
    list: EventProblem[]; // EventProblem, concern order.
}