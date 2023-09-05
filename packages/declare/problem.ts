export type StandardProblemStatementProp = 'background' | 'statement' | 'inFormer' | 'outFormer' | 'samples' | 'hint' | string;

/*
* Standard Problem Statement Format.
* 标准题目陈述格式
* */
export interface StandardProblemStatement extends Record<string, Array<string> | string | undefined | Array<{in: string, out: string}>> { // Standard Problem Statement
    background?: string; // background. / 题目背景 / Only HTML
    statement?: string; // statement. / 题目描述 / Only HTML
    inFormer?: string; // In Former. / 输入格式 / Only HTML
    outFormer?: string; // Out Former. / 输出格式 / Only HTML
    samples: {
        in: string; // Sample In / 样例输入 / Texts
        out: string; // Sample Out / 样例输出 / Texts
    }[]; // Samples / 样例组 / Texts / Must Required([] if null)
    hint?: string; // Hint / 提示 / Only HTML
    showProp: StandardProblemStatementProp[]; // show Prop / 展示的题目格式 /  Must Required([] if null)
}


export interface TagView {
    hint: string; 
    id: string;
    color?: string;
}

/*
* Standard Format / Universal Format.
* 标准格式 / 全局传输格式
* */
export interface Problem { //Standard Problem Schema
    version: Record<string, StandardProblemStatement>; // Statement
    defaultVersion: string; // default
    title: string;
    sources: {
        platform: string; // 中文
        pid: string; // 题号
    }[];
    tags?: TagView[]; // events
    algorithm?: TagView[]; // 算法标签
    translate?: StandardProblemStatement; // translate version.
    allowedPlatform?: {
        platform: string;
        pid: string;
        allowPublic: boolean;
    }[]; // 可接受提交的平台及其题目提交位置
    history?: {
        score: string;
    }; // If user login.
    limit: {
        time: string;
        memory: string;
        difficult: {
            text: string;
            color: string;
            hint: string;
        }
    }
}

/*
* 英语名称的展示问题 （i18n影响）
* */
export const StatementToCNName: Record<string, string | undefined> = {
    background: '题目背景',
    statement: '题目描述',
    inFormer: '输入格式',
    outFormer: '输出格式',
    samples: '样例组',
    hint: '提示',
    pdf: '题目PDF'
};

export const PlatformToCNName: Record<string, string | undefined> = {
    luogu: '洛谷',
};