// import _ from 'lodash';

import { token } from '../model/token';
import { db } from '../service/db';
import { PermError } from './error';

export class BasicPermModel {
    permlist: Array<string> = [];

    constructor(permlist: Array<string> = []) {
        this.permlist = permlist;
    }

    generate(list: Array<string>, mode: 'except' | 'require' = 'require') {
        let res = 0;
        const len = this.permlist.length;
        for (let i = 0; i < len; i++) {
            const v = this.permlist[i];
            const status = +!(+list.includes(v) - +(mode === 'require'));
            res = res | (status << i);
        }
        return res;
    }

    getPerm(value: number) {
        let count = 0;
        if (value === -1) {
            return this.permlist;
        }
        const res: Array<string> = [];
        // console.log(value);
        while (value > 0) {
            const v = value & 1;
            if (v === 1) {
                res.push(this.permlist[count]);
            }
            count++;
            value >>= 1;
        }
        // console.log(res);
        return res;
    }
}

export class PermClass {
    handler: BasicPermModel;

    constructor(handler: BasicPermModel) {
        this.handler = handler;
    }

    getPerm(value: number) {
        return this.handler.getPerm(value);
    }

    addPerm(value: number, list: Array<string>, mode: 'except' | 'require' = 'require') {
        return this.handler.generate(list, mode) | value;
    }

    delPerm(value: number, list: Array<string>, mode: 'except' | 'require' = 'require') {
        return (this.handler.generate(list, mode) & value) ^ value;
    }

    checkPerm(value: number, perm: string) {
        return ((value >> this.handler.permlist.indexOf(perm)) & 1) === 1;
    }
}

export class Perm {
    value: number;
    handler: BasicPermModel;

    constructor(handler: BasicPermModel, value = 0) {
        this.handler = handler;
        this.value = value;
    }

    getPerm() {
        return this.handler.getPerm(this.value);
    }

    addPerm(list: Array<string>, mode: 'except' | 'require' = 'require') {
        this.value = this.handler.generate(list, mode) | this.value;
    }

    delPerm(list: Array<string>, mode: 'except' | 'require' = 'require') {
        this.value = (this.handler.generate(list, mode) & this.value) ^ this.value;
    }

    checkPerm(perm: string) {
        return ((this.value >> this.handler.permlist.indexOf(perm)) & 1) === 1;
    }
}

/*
export const userPermList = ['view', 'modifyOwn', 'modifyAll', 'delete', 'action'];
export const userPermExplain = ['查看帖子', '修改个人发布', '修改全部发布', '删除帖子', '帖子交互'];
export const userPermHandler = new BasicPermModel(userPermList);
export const userPerm = new PermClass(userPermHandler);
export const userPermDefault =  3;
export const userPerm = 

*/

const permColl = {};

export function registerPerm(name: string, list: Array<string>, explain: Array<string>, defaultvalue: number, guestvalue: number) {
    const engine = new BasicPermModel(list);
    return (permColl[name] = {
        list,
        explain,
        default: defaultvalue,
        guest: guestvalue,
        engine,
        handler: new PermClass(engine),
    });
}

export function checkPerm(value: number, model: string, perm: string) {
    return permColl[model].handler.checkPerm(value, perm);
}

export function perm(model: string, name: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return function(target: any, methodName: string, descriptor: any) {
        descriptor.originalMethodPerm = descriptor.value;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        descriptor.value = async function run(args: any) {
            let id = args?.id || 0;
            if (id === 0) {
                id = await token.stripId(args.token);
                if (id === -1) {
                    id = 0;
                }
            } else {
                if ((await token.check(id, args?.token)) !== true) {
                    id = 0;
                }
            }
            const defaultValue = permColl[model].default,
                guestValue = permColl[model].guest;
            let value = 0;
            if (id !== 0) {
                const dbData = await db.getone('perm', { id });
                value = (dbData || {})[model] || defaultValue;
            } else {
                value = guestValue;
            }
            if (checkPerm(value, model, name) === false) {
                throw new PermError(id, name);
            }
            return await descriptor.originalMethodPerm.apply(this, [args]);
        };
    };
}
