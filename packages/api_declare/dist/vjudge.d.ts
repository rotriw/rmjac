export type VjudgeAuth = {
    Password: string;
} | {
    Token: string;
};
export declare enum RemoteMode {
    PublicAccount = 0,
    OnlySync = 1,
    SyncCode = 2
}
export interface VjudgeNodePublic {
    platform: string;
    verified_code: string;
    verified: boolean;
    iden: string;
    creation_time: string;
    updated_at: string;
    remote_mode: RemoteMode;
}
export interface VjudgeNodePrivate {
    auth?: VjudgeAuth | null;
}
export interface VjudgeNode {
    node_id: number;
    public: VjudgeNodePublic;
    private: VjudgeNodePrivate;
}
export interface BindAccountReq {
    platform: string;
    method: string;
    auth?: VjudgeAuth | null;
    bypass_check?: boolean | null;
    ws_id?: string | null;
    iden: string;
}
export interface UpdateAccountReq {
    node_id: number;
    auth?: VjudgeAuth | null;
}
export interface AssignTaskReq {
    vjudge_node_id: number;
    range: string;
    ws_id?: string | null;
}
export interface ListByIdsReq {
    ids: number[];
}
export interface VjudgeTaskNodePublic {
    status: string;
    log: string;
    created_at: string;
    updated_at: string;
}
export interface VjudgeTaskNodePrivate {
}
export interface VjudgeTaskNode {
    node_id: number;
    public: VjudgeTaskNodePublic;
    private: VjudgeTaskNodePrivate;
}
export interface VjudgeResponse<T = unknown> {
    code: number;
    msg: string;
    data?: T;
}
