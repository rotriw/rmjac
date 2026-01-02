export interface VjudgeNode {
    node_id: number;
    public: {
        platform: string;
        iden: string;
        verified_code: string;
        remote_mode: "PublicAccount" | "SyncCode" | "All";
    };
    private: {
        auth: VjudgeAuth;
    }
}

export interface VjudgeAuth {
    Password?: string;
    Token?: string;
}