import { db } from '../service/db';
import { v4 as uuidv4 } from 'uuid';
import { rdis } from '../service/redis';
import { isNull } from 'lodash';

export class TokenModel {
    async create(id: number, expires: number) {
        const token = uuidv4();
        const create = Math.ceil(Date.now() / 1000);
        if (expires <= 7 * 24 * 60 * 60) {
            rdis.setjson(
                'token',
                token,
                {
                    id,
                    expires: create + expires,
                    create,
                },
                expires
            );
        }
        db.insert('token', {
            id,
            token,
            expires: create + expires,
            create,
        });
        return token;
    }

    async check(id: number, token: string): Promise<boolean> {
        let value = await rdis.getjson('token', token);
        let fromDatabase = false;
        if (typeof value.id === 'undefined') {
            value = await db.getone('token', { token });
            if (isNull(value)) {
                return false;
            }
            fromDatabase = true;
        }
        if (value.id !== id) {
            return false;
        }
        const now = Math.ceil(Date.now() / 1000);
        if (value.expires < now) {
            return false;
        }
        if (fromDatabase) {
            rdis.setjson(
                'token',
                token,
                {
                    id,
                    expires: value.expires,
                    create: value.create,
                },
                Math.min(7 * 24 * 60 * 60, now - value.expires)
            );
        }
        return true;
    }

    async stripId(token: string): Promise<number> {
        let value = await rdis.getjson('token', token);
        let fromDatabase = false;
        if (typeof value.id === 'undefined') {
            value = await db.getone('token', { token });
            if (isNull(value)) {
                return -1;
            }
            fromDatabase = true;
        }
        const now = Math.ceil(Date.now() / 1000);
        if (value.expires < now) {
            return -1;
        }
        if (fromDatabase) {
            rdis.setjson(
                'token',
                token,
                {
                    id: value.id,
                    expires: value.expires,
                    create: value.create,
                },
                Math.min(7 * 24 * 60 * 60, now - value.expires)
            );
        }
        return value.id;
    }

    async revokeToken(token: string) {
        await rdis.delete('token', token);
        await db.deleteOne('token', { token });
    }

    async revokeUserToken(uid: number) {
        const token = await db.getall('token', { id: uid }, {});
        for (const i of token) {
            await rdis.delete('token', i.token);
        }
        await db.deleteAll('token', { id: uid });
    }
}
export const token = new TokenModel();
