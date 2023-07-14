import { DuplicateError, NotFoundError, ValidationError } from '../declare/error';
import { registerPerm } from '../declare/perm';
import { db } from '../service/db';

export interface CommentSchema {
    cid: number;
    did: number;
    authorId: number;
    content: string;
    createdTime: number;
    lastModified: number;
    responds: Record<string, Array<number>>;
    deleted: boolean;
}

type CommentUpdatedSchema = Omit<Partial<CommentSchema>, 'cid' | 'did'>;

class CommentModel {
    async genCommentId() {
        const newID = (await db.getone('count', { type: 'commentId' }))?.count + 1 || 1;
        if (newID === 1) {
            await db.insert('count', { type: 'commentId', count: newID });
        }
        await db.update('count', { type: 'commentId' }, { count: newID });
        return newID;
    }

    async idExist(cid: number) {
        const data = await db.getone('comment', { cid });
        return data !== null;
    }

    async listComments(did: number, limit?: number, skip?: number) {
        const data = (await db.getall('comment', { did }, { limit, skip })).map((item) => {
            delete item._id;
            return (item as unknown) as CommentSchema;
        });
        return data;
    }

    async commentCount(did: number) {
        const data = (await db.getall('comment', { did })).map((item) => {
            delete item._id;
            return (item as unknown) as CommentSchema;
        });
        return data.length;
    }

    /**
     * @deprecated This method is deprecated and will be removed in future versions.
     * Use `listComments` instead.
     */
    async list(did: number) {
        return this.listComments(did);
    }

    async info(cid: number) {
        if ((await this.idExist(cid)) === false) {
            throw new NotFoundError('comment', 'cid');
        }
        const data = (await db.getone('comment', { cid })) as CommentSchema;
        if (data.deleted) {
            throw new NotFoundError('comment', 'cid');
        }
        return {
            author: data.authorId,
            content: data.content,
            time: data.createdTime,
        };
    }

    async find(cid: number): Promise<CommentSchema> {
        if ((await this.idExist(cid)) === false) {
            throw new NotFoundError('comment', 'cid');
        }
        const data = await db.getone('comment', { cid });
        delete data._id;
        if (data.deleted) {
            throw new NotFoundError('comment', 'cid');
        }
        return data;
    }

    async create(data: Omit<CommentSchema, 'cid'>) {
        const { did, authorId, content, createdTime, lastModified, responds, deleted } = data;
        const cid = await this.genCommentId();
        await db.insert('comment', {
            cid,
            did,
            authorId,
            content,
            createdTime,
            lastModified,
            responds,
            deleted,
        });
        return { cid };
    }

    async update(cid: number, data: CommentUpdatedSchema) {
        if ((await this.idExist(cid)) === false) {
            throw new NotFoundError('comment', 'cid');
        }
        await db.update(
            'comment',
            {
                cid,
            },
            data
        );
        return;
    }

    emojiCheck(emoji: string): boolean {
        const regex = /^\p{Extended_Pictographic}$/u;
        return regex.test(emoji);
    }

    async respondWithCommentId(uid: number, cid: number, emoji: string) {
        if (!this.emojiCheck(emoji)) {
            throw new ValidationError('emoji');
        }
        if ((await this.idExist(cid)) === false) {
            throw new NotFoundError('comment', 'cid');
        }
        const data = (await db.getone('comment', { cid })) as CommentSchema;
        if (data.deleted) {
            throw new NotFoundError('comment', 'cid');
        }
        const users = data.responds[emoji] || [];
        if (users.includes(uid)) {
            throw new DuplicateError('emoji');
        }
        users.push(uid);
        data.responds[emoji] = users;
        await db.update(
            'comment',
            {
                cid,
            },
            data
        );
        return;
    }

    async getResponds(cid: number) {
        const data = (await db.getone('comment', { cid })) as CommentSchema;
        if (data.deleted) {
            throw new NotFoundError('comment', 'cid');
        }
        return data.responds;
    }
}

export const comment = new CommentModel();

export const commentPerm = registerPerm(
    'comment',
    ['view', 'modifyOwn', 'modifyAll', 'delete'],
    ['查看评论', '修改个人评论', '修改全部评论', '删除评论'],
    3,
    1
);
