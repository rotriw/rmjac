import { perm } from '../declare/perm';
import { DefaultType } from '../declare/type';
import { Handler, Route } from '../handle';
import { DiscussSchema, RespondProps, discuss } from '../model/discuss';
import { param } from '../utils/decorate';
import { token as tokenModel } from '../model/token';
import { CommentSchema, comment } from '../model/comment';
import { user } from '../model/user';

interface CommentSchemaExtra {
    authorName: string;
    authorAvatar: string;
}

interface DiscussSchemaExtra {
    authorName: string;
    authorAvatar: string;
    commentCount: number;
    comments: (CommentSchema & CommentSchemaExtra)[];
    parsedResponds: RespondProps[];
}

class DiscussHandler extends Handler {
    @perm('discuss', 'view')
    @param('did', DefaultType.Number)
    async postInfo(did: string) {
        try {
            const discussData = await discuss.find(parseInt(did));
            const author = await user.getbyId(discussData.author);
            const comments = await comment.listComments(parseInt(did));
            const commentsWithName = await Promise.all(
                comments.map(async (comment) => {
                    const author = await user.getbyId(comment.authorId);
                    const data: CommentSchema & CommentSchemaExtra = {
                        ...comment,
                        authorName: author.username,
                        authorAvatar: author.gravatarLink,
                    };
                    return data;
                })
            );
            const commentCount = await comment.commentCount(parseInt(did));
            const respondData = await discuss.getResponds(parseInt(did));
            // remove omit => will show respond user in ui
            const data: Omit<DiscussSchema, 'responds'> & DiscussSchemaExtra = {
                ...discussData,
                authorName: author.username,
                authorAvatar: author.gravatarLink,
                commentCount,
                comments: commentsWithName,
                parsedResponds: respondData,
            };
            this.ctx.body = {
                status: 'success',
                data,
            };
        } catch (err) {
            this.ctx.body = {
                status: 'error',
                type: err?.errorType || 'unknown',
                param: err?.errorParam || '',
            };
        }
    }

    @perm('discuss', 'view')
    @param('did', DefaultType.String)
    async postFetchResponds(did: string) {
        try {
            const data = await discuss.getResponds(parseInt(did));
            this.ctx.body = {
                status: 'success',
                responds: data,
            };
        } catch (err) {
            this.ctx.body = {
                status: 'error',
                type: err?.errorType || 'unknown',
                param: err?.errorParam || '',
            };
        }
    }

    @perm('comment', 'view')
    @param('did', DefaultType.String)
    @param('limit', DefaultType.Number)
    @param('page', DefaultType.Number)
    // Page starts at 0
    async postFetchComments(did: string, limit: number, page: number) {
        try {
            if (limit > 50 || limit < 10) {
                limit = 20;
            }
            const data = await comment.listComments(parseInt(did), limit, page * limit);
            const dataWithName = await Promise.all(
                data.map(async (comment) => {
                    const author = await user.getbyId(comment.authorId);
                    const commentData: CommentSchema & CommentSchemaExtra = {
                        ...comment,
                        authorName: author.username,
                        authorAvatar: author.gravatarLink,
                    };
                    return commentData;
                })
            );
            this.ctx.body = {
                status: 'success',
                comments: dataWithName,
            };
        } catch (err) {
            this.ctx.body = {
                status: 'error',
                type: err?.errorType || 'unknown',
                param: err?.errorParam || '',
            };
        }
    }

    @perm('discuss', 'view')
    @param('token', DefaultType.String)
    @param('did', DefaultType.Number)
    @param('emoji', DefaultType.String)
    async postRespond(token: string, did: number, emoji: string) {
        try {
            const author = await tokenModel.stripId(token);
            await discuss.respondWithDiscussId(author, did, emoji);
            this.ctx.body = {
                status: 'success',
            };
        } catch (err) {
            this.ctx.body = {
                status: 'error',
                type: err?.errorType || 'unknown',
                param: err?.errorParam || '',
            };
        }
    }

    @perm('discuss', 'view')
    @param('token', DefaultType.String)
    @param('cid', DefaultType.Number)
    @param('emoji', DefaultType.String)
    async postRespondComment(token: string, cid: number, emoji: string) {
        try {
            const author = await tokenModel.stripId(token);
            const data = await comment.respondWithCommentId(author, cid, emoji);
            this.ctx.body = {
                status: 'success',
                responds: data,
            };
        } catch (err) {
            this.ctx.body = {
                status: 'error',
                type: err?.errorType || 'unknown',
                param: err?.errorParam || '',
            };
        }
    }

    @perm('discuss', 'modifyOwn')
    @param('token', DefaultType.String)
    @param('topic', DefaultType.String)
    @param('tags', DefaultType.Any)
    @param('title', DefaultType.String)
    @param('content', DefaultType.String)
    async postCreate(token: string, topic: string, tags: string[], title: string, content: string) {
        try {
            const author = await tokenModel.stripId(token);
            const data = await discuss.create({
                author,
                topic,
                tags,
                title,
                content,
                createdTime: Date.now() / 1000,
                lastModified: Date.now() / 1000,
                responds: {},
                deleted: false,
                official: false,
                officialNotice: '',
            });
            this.ctx.body = {
                status: 'success',
                data,
            };
        } catch (err) {
            this.ctx.body = {
                status: 'error',
                type: err?.errorType || 'unknown',
                param: err?.errorParam || '',
            };
        }
    }

    @perm('comment', 'modifyOwn')
    @param('token', DefaultType.String)
    @param('did', DefaultType.Number)
    @param('content', DefaultType.String)
    async postCreateComment(token: string, did: number, content: string) {
        try {
            const authorId = await tokenModel.stripId(token);
            const data = await comment.create({
                authorId,
                did,
                content,
                createdTime: Date.now() / 1000,
                lastModified: Date.now() / 1000,
                responds: {},
                deleted: false,
            });
            this.ctx.body = {
                status: 'success',
                data,
            };
        } catch (err) {
            this.ctx.body = {
                status: 'error',
                type: err?.errorType || 'unknown',
                param: err?.errorParam || '',
            };
        }
    }
}

export function apply() {
    Route('Discuss', '/discuss', DiscussHandler);
    Route('Discuss', '/discuss/:did', DiscussHandler);
}
