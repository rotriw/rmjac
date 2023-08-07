import { db } from '../service/db';
import { rdis } from '../service/redis';

export interface ProblemContent {
    type: 'html' | 'markdown';
    content: {
        background?: string;
        statement?: string;
        inFormer?: string;
        outFormer?: string;
        testdata?: {
            in: string;
            out: string;
        }[];
        hint?: string;
    };
}

export interface ProblemSource {
    platform: string;
    psid: string;
}

export interface ProblemSchema {
    sourceid?: string[];
    pid: number;
    sources?: ProblemSource[];
    content?: ProblemContent;
    version?: Record<string, ProblemContent>;
    versionDisplay?: Record<string, string>;
    tags?: string[];
    timeLimit: number | string;
    memoryLimit: number | string;
    difficult: number | string;
    copyrightRisk?: number;
}

export class ProblemModel {

    async genId() {
        const newID = (await db.getone('count', { type: 'pid' }))?.count + 1 || 1;
        if (newID === 1) {
            await db.insert('count', { type: 'pid', count: newID });
        }
        await db.update('count', { type: 'pid' }, { count: newID });
        return newID;
    }

    async create(title: string, content: Omit<ProblemSchema, 'pid'>) {
        const pid = await this.genId();
        const newProblem = content;
        Object.assign(newProblem, {pid});
        Object.assign(newProblem, {title});
        await db.insert('problem', newProblem);
        return pid;
    }

    async getObjectFromPSID(psid: string): Promise<undefined | ProblemSchema> {
        let _res = await rdis.getjson('problem_psid_object', psid), _flag = false;
        if (!Object.keys(_res).length) {
            _res = await db.findOneIn('problem', 'sourceid', psid);
            _flag = true;
        }
        if (_res === null) {
            return undefined;
        }
        if (_flag)
            rdis.setjson('problem_psid_object', psid, _res, 5000);
        return _res as unknown as ProblemSchema;
    }

    async getIdFromPSID(psid: string): Promise<undefined | number> {
        const _res = await rdis.get('problem_psid_onlyid', psid) as unknown as number;
        if (_res !== null && _res !== undefined) {
            return _res;
        }
        const __res = await db.findOneIn('problem', 'sourceid', psid) as unknown as ProblemSchema;
        if (__res === null) {
            return undefined;
        }
        rdis.set('problem_psid_onlyid', psid, __res.pid as unknown as string, 5000);
        return __res.pid;
    }

    async update(pid: number, content: Omit<ProblemSchema, 'pid'>) {
        const __res = await db.findOneIn('problem', 'pid', pid) as unknown as ProblemSchema;
        let psid;
        for (psid of __res.sourceid || []) {    
            rdis.delete('problem_psid_onlyid', psid);
            rdis.delete('problem_psid_object', psid);
        }
        Object.assign(content, {pid});
        await db.update('problem', {pid}, content);
    }
}

export const problem = new ProblemModel();