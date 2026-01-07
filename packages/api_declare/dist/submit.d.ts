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
    is_input: boolean;
    allowed_option: string[];
}
export interface LanguageChoiceInformation {
    name: string;
    allow_option: LanguageChoiceOptionsInformation[];
}
