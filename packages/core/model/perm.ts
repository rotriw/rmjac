import { db } from '../service/db';

export class PermModel {
    async getPerm(id: number): Promise<unknown> {
        return (await db.getone('perm', { id })) || {};
    }
}

export const perm = new PermModel();