import { db } from '../service/db';
import { DuplicateError, NotFoundError } from '../declare/error';
import { isNull } from 'lodash';
import { registerPerm } from '../declare/perm';

export class UserSchema {
    id?: number;
    username: string;
    pwd: string;
    salt: string;
    email: string;
    grade: number;
    gender: Gender | string;
    gravatarLink: string;
    description: string;
}

export class UserUpdatedSchema {
    username?: string;
    pwd?: string;
    email?: string;
    grade?: number;
    gender?: Gender | string;
    gravatarLink?: string;
    description?: string;
}

enum Gender {
    Female = 0,
    Male = 1,
}

export class UserModel {
    async create(data: UserSchema) {
        const { username, pwd, salt, email, grade, gender, gravatarLink, description } = data;
        if (await this.nameExist(username)) {
            throw new DuplicateError('name');
        }
        if (await this.emailExist(email)) {
            throw new DuplicateError('email');
        }
        const id = await this.genId();
        await db.insert('user', {
            id,
            username,
            pwd,
            salt,
            email,
            grade,
            gender,
            gravatarLink,
            description,
        });
        return {
            id,
        };
    }

    async updateall(data: UserSchema) {
        const { username, pwd, email, salt, grade, gender, gravatarLink, description } = data;
        if (await this.nameExist(username)) {
            throw new DuplicateError('name');
        }
        const id = this.genId();
        await db.insert('user', {
            id,
            username,
            pwd,
            salt,
            email,
            grade,
            gender,
            gravatarLink,
            description,
        });
        return {
            id,
        };
    }

    async update(id: number, data: UserUpdatedSchema) {
        if ((await this.idExist(id)) === false) {
            throw new NotFoundError('user', 'id');
        }
        await db.update(
            'user',
            {
                id,
            },
            data
        );
        return;
    }

    async genId() {
        const newID = (await db.getone('count', { type: 'uid' }))?.count + 1 || 1;
        if (newID === 1) {
            await db.insert('count', { type: 'uid', count: newID });
        }
        await db.update('count', { type: 'uid' }, { count: newID });
        return newID;
    }

    async nameExist(username: string) {
        return !isNull(
            await db.getone('user', {
                username,
            })
        );
    }

    async emailExist(email: string) {
        return !isNull(
            await db.getone('user', {
                email,
            })
        );
    }

    async idExist(id: number) {
        return !isNull(
            await db.getone(
                'user',
                {
                    id,
                },
                {}
            )
        );
    }

    handle(data: UserSchema) {
        if (typeof data.gender === 'boolean') {
            data.gender = data.gender ? 'male' : 'female';
        }
        return data;
    }

    async getbyId(id: number) {
        const idData = await db.getone('user', {
            id,
        });
        if (isNull(idData)) {
            throw new NotFoundError('id', id);
        }
        return this.handle(idData as unknown as UserSchema);
    }

    async getbyUsername(username: string) {
        const nameData = await db.getone('user', {
            username,
        });
        if (isNull(nameData)) {
            throw new NotFoundError('username', username);
        }
        return this.handle(nameData as unknown as UserSchema);
    }

    async getbyEmail(email: string) {
        const emailData = await db.getone('user', {
            email,
        });
        if (isNull(emailData)) {
            throw new NotFoundError('email', email);
        }
        return this.handle(emailData as unknown as UserSchema);
    }
}

export const user = new UserModel();


export const userPerm = registerPerm(
    'user',
    ['view'],
    ['进入主站'],
    1,
    1
);