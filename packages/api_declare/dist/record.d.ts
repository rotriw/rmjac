export declare enum RecordStatus {
    Accepted = "Accepted",
    PartialAccepted = "Partial Accepted",
    WrongAnswer = "Wrong Answer",
    TimeLimitExceeded = "Time Limit Exceeded",
    MemoryLimitExceeded = "Memory Limit Exceeded",
    OutputLimitExceeded = "Output Limit Exceeded",
    IdlenessLimitExceeded = "Idleness Limit Exceeded",
    RuntimeError = "Runtime Error",
    CompileError = "Compile Error",
    DangerousCode = "Dangerous Code",
    RemoteServiceUnknownError = "Remote Service Unknown Error",
    SandboxError = "Sandbox Error",
    RemotePlatformRefused = "Remote Platform Refused",
    RemotePlatformConnectionFailed = "Remote Platform Connection Failed",
    RemotePlatformUnknownError = "Remote Platform Unknown Error",
    Waiting = "Waiting",
    UnknownError = "Unknown Error",
    Deleted = "Deleted",
    OnlyArchived = "OnlyArchived",
    NotFound = "NotFound",
    Skipped = "Skipped",
    Judging = "Judging"
}
export interface SubtaskUserRecord {
    time: number;
    memory: number;
    status: RecordStatus;
    subtask_status: SubtaskUserRecord[];
    score: number;
}
export interface RecordNewProp {
    platform: string;
    code: string;
    code_language: string;
    url: string;
    statement_node_id: number;
    public_status: boolean;
}
export interface CreateRecordRequest {
    platform: string;
    code: string;
    code_language: string;
    url: string;
    problem_iden: string;
    public_status: boolean;
}
export interface UpdateStatusRequest {
    status: number;
}
export interface ListRecordsQuery {
    page?: number | null;
    per_page?: number | null;
    user?: string | null;
    problem?: string | null;
    status?: number | null;
    platform?: string | null;
}
export interface RecordNodePublic {
    record_order: number;
    record_score: number;
    record_platform: string;
    record_status: RecordStatus;
    record_message: string;
    record_time: string;
    record_update_time: string;
    code?: string | null;
    code_language?: string | null;
    record_url?: string | null;
}
export interface RecordNodePrivate {
    code: string;
    code_language: string;
}
export interface RecordNode {
    node_id: number;
    public: RecordNodePublic;
    private: RecordNodePrivate;
}
export interface RecordEdge {
    id: number;
    u: number;
    v: number;
    record_node_id: number;
    record_status: RecordStatus;
    code_length: number;
    score: number;
    submit_time: string;
    platform: string;
}
export interface RecordViewResponse {
    record: RecordNode;
    judge_data: SubtaskUserRecord | null;
}
export interface RecordListItem {
    edge: RecordEdge;
    problem_name: string;
    problem_iden: string;
    user_name: string;
    user_iden: string;
}
export interface RecordListResponse {
    records: RecordListItem[];
    page: number;
    per_page: number;
    total: number;
}
