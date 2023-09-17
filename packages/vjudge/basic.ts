/* eslint-disable @typescript-eslint/no-unused-vars */
/* eslint-disable @typescript-eslint/no-empty-function */

export interface VjudgeSubmitOption {
    language: string | number;
    cookie: string;
}

export type sid = number;

export class BasicVjudge {
    async syncSubmit(uid: string, options: VjudgeSubmitOption): Promise<sid> {
        return -1;
    }

    async submitCode(code: string, options: VjudgeSubmitOption): Promise<sid> {
        return -1;
    }
}
