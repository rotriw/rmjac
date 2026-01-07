import { SimplyUser } from "./user";
import { RecordNode } from "./record";

export interface ProblemStatementProp {
    statement_source: string;
    iden: string;
    problem_statements: ContentType[];
    time_limit: number;
    memory_limit: number;
    sample_group: [string, string][];
    show_order: string[];
    page_source?: string | null;
    page_rendered?: string | null;
    problem_difficulty?: number | null;
}

export interface ContentType {
    iden: string;
    content: string;
}

export interface CreateProblemProps {
    user_id: number;
    problem_iden: string;
    problem_name: string;
    problem_statement: ProblemStatementProp[];
    creation_time?: string | null;
    tags: string[];
}

export interface ProblemListQuery {
    page?: number | null;
    per_page?: number | null;
    name?: string | null;
    tag?: string[] | null;
    author?: string | null;
    difficulty?: number | null;
}

export interface ProblemNodePublic {
    name: string;
    creation_time: string;
    creation_order: number;
}

export interface ProblemNodePrivate {}

export interface ProblemNode {
    node_id: number;
    public: ProblemNodePublic;
    private: ProblemNodePrivate;
}

export interface ProblemStatementNodePublic {
    statements: ContentType[];
    source: string;
    iden: string;
    creation_time: string;
    update_time: string;
    sample_group: [string, string][];
    show_order: string[];
    page_source?: string | null;
    page_rendered?: string | null;
    problem_difficulty?: number | null;
}

export interface ProblemStatementNodePrivate {}

export interface ProblemStatementNode {
    node_id: number;
    public: ProblemStatementNodePublic;
    private: ProblemStatementNodePrivate;
}

export interface ProblemLimitNodePublic {
    time_limit: number;
    memory_limit: number;
}

export interface ProblemLimitNodePrivate {}

export interface ProblemLimitNode {
    node_id: number;
    public: ProblemLimitNodePublic;
    private: ProblemLimitNodePrivate;
}

export interface ProblemTagNodePublic {
    tag_name: string;
    tag_description: string;
}

export interface ProblemTagNodePrivate {}

export interface ProblemTagNode {
    node_id: number;
    public: ProblemTagNodePublic;
    private: ProblemTagNodePrivate;
}

export interface ProblemModel {
    problem_node: ProblemNode;
    problem_statement_node: [ProblemStatementNode, ProblemLimitNode][];
    tag: ProblemTagNode[];
    author?: SimplyUser | null;
}

export interface ProblemViewResponse {
    model: ProblemModel;
    statement: number;
    user_recent_records?: RecordNode[] | null;
    user_last_accepted_record?: RecordNode[] | null;
}

export interface ProblemListItem {
    model: ProblemModel;
    iden: string;
}

export interface ProblemListResponse {
    problems: ProblemListItem[];
    page: number;
    per_page: number;
    total: number;
}

export interface ProblemUpdateResponse {
    message: string;
    result?: ProblemModel;
}