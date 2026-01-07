export interface SubmitReq {
    statement_id: number;
    vjudge_id: number;
    code: string;
    language: string;
    judge_option: Record<string, string>;
    public_view: boolean;
}

export interface LanguageChoiceOptionsInformation {
    name: string;
    is_compile: boolean;
    is_input: boolean; // 是否允许键入值。
    allowed_option: string[]; // value.
}

export interface LanguageChoiceInformation {
    name: string;
    allow_option: LanguageChoiceOptionsInformation[];
}