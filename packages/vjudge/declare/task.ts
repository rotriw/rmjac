import { VjudgeNode } from "./node.ts";

export interface BasicTaskData {
    operation: string;
    platform: string;
    method: string;
}

export interface VjudgeUserTaskData extends BasicTaskData {
    vjudge_node: VjudgeNode;
    ws_id: string | null;
}

export interface SyncTaskData extends VjudgeUserTaskData {
    range?: string;
    url?: string;
}

export interface VerifyTaskData extends VjudgeUserTaskData {
    handle: string;
}

export interface SubmitTaskData extends VjudgeUserTaskData {
    problem_id: string;
    language: string;
    code: string;
}

export interface VjudgeProblemTaskData extends BasicTaskData {
    problem_id: string;
}

export type TaskData = SyncTaskData | VerifyTaskData | SubmitTaskData | VjudgeProblemTaskData;