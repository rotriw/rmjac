export interface VjudgeNode {
    node_id: number;
    public: {
        platform: string;
        iden: string;
        remote_mode: "PublicAccount" | "SyncCode" | "All";
    };
    private: {
        auth: VjudgeAuth;
    }
}

export interface VjudgeAuth {
    password?: string;
    token?: string;
}