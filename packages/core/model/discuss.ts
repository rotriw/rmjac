import { isNull } from 'lodash';
import { registerPerm } from '../declare/perm';
import { db } from '../service/db';
import { DuplicateError, NotFoundError, ValidationError } from '../declare/error';
import { comment } from './comment';

export class DiscussSchema {
    did?: number;
    author: number;
    topic: string;
    tags: Array<string>;
    title: string;
    content: string;
    createdTime: number;
    lastModified: number;
    // It is like {'😅': [1, 2, 3]}
    responds: Record<string, Array<number>>;
    deleted: boolean;
    official: boolean;
    officialNotice: string;
}

export class RespondProps {
    emoji: string;
    count: number;
}

type DiscussUpdatedSchema = Omit<Partial<DiscussSchema>, 'did'>;

export class DiscussModel {
    async genDId() {
        const newID = (await db.getone('count', { type: 'discussId' }))?.count + 1 || 1;
        if (newID === 1) {
            await db.insert('count', { type: 'discussId', count: newID });
        }
        await db.update('count', { type: 'discussId' }, { count: newID });
        return newID;
    }

    async create(data: Omit<DiscussSchema, 'did'>) {
        const { author, topic, tags, title, content, createdTime, lastModified, responds, deleted, official, officialNotice } = data;
        const did = await this.genDId();
        await db.insert('discuss', {
            did,
            author,
            topic,
            tags,
            title,
            content,
            createdTime,
            lastModified,
            commentsNumber: 0,
            responds,
            deleted,
            official,
            officialNotice,
        });
        return {
            did,
        };
    }

    async idExist(did: number) {
        return !isNull(
            await db.getone(
                'discuss',
                {
                    did,
                },
                {}
            )
        );
    }

    async update(did: number, data: DiscussUpdatedSchema) {
        if ((await this.idExist(did)) === false) {
            throw new NotFoundError('discuss', 'did');
        }
        await db.update(
            'discuss',
            {
                did,
            },
            data
        );
        return;
    }

    emojiCheck(emoji: string): boolean {
        const regex = /^\p{Extended_Pictographic}$/u;
        return regex.test(emoji);
    }

    async respondWithDiscussId(uid: number, did: number, emoji: string) {
        if (!this.emojiCheck(emoji)) {
            throw new ValidationError('emoji');
        }
        if ((await this.idExist(did)) === false) {
            throw new NotFoundError('discuss', 'did');
        }
        const data = (await db.getone('discuss', { did })) as DiscussSchema;
        if (data.deleted) {
            throw new NotFoundError('discuss', 'did');
        }
        const users = data.responds[emoji] || [];
        if (users.includes(uid)) {
            throw new DuplicateError('emoji');
        }
        users.push(uid);
        data.responds[emoji] = users;
        await db.update(
            'discuss',
            {
                did,
            },
            data
        );
        return;
    }

    async info(did: number) {
        if ((await this.idExist(did)) === false) {
            throw new NotFoundError('discuss', 'did');
        }
        const data = (await db.getone('discuss', { did })) as DiscussSchema;
        if (data.deleted) {
            throw new NotFoundError('discuss', 'did');
        }
        return {
            author: data.author,
            time: data.createdTime,
        };
    }

    async find(did: number): Promise<DiscussSchema> {
        if ((await this.idExist(did)) === false) {
            throw new NotFoundError('discuss', 'did');
        }
        const data = await db.getone('discuss', { did });
        delete data._id;
        if (data.deleted) {
            throw new NotFoundError('discuss', 'did');
        }

        return data;
    }

    async getResponds(did: number) {
        const data = (await db.getone('discuss', { did })) as DiscussSchema;
        if (data.deleted) {
            throw new NotFoundError('discuss', 'did');
        }
        const responds: RespondProps[] = Object.entries(data.responds).map(([emoji, users]) => ({ emoji, count: users.length }));
        return responds;
    }

    async sendComment(did: number, authorId: number, commentContent: string) {
        if ((await this.idExist(did)) === false) {
            throw new NotFoundError('discuss', 'did');
        }
        const data = (await db.getone('discuss', { did })) as DiscussSchema;
        if (data.deleted) {
            throw new NotFoundError('discuss', 'did');
        }
        const commentData = {
            did,
            authorId,
            content: commentContent,
            createdTime: Date.now(),
            lastModified: Date.now(),
            responds: {},
            deleted: false,
        };
        await comment.create(commentData);
        return;
    }
}

export const discuss = new DiscussModel();

export const discussPerm = registerPerm(
    'discuss',
    ['view', 'modifyOwn', 'modifyAll', 'delete', 'action'],
    ['查看帖子', '修改个人发布', '修改全部发布', '删除帖子', '帖子交互'],
    3,
    1
);
