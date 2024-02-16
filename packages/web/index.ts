/* eslint-disable @typescript-eslint/no-explicit-any */
import Koa, { Context } from 'koa';
import KoaBody from 'koa-body';
import bodyParser from 'koa-bodyparser';
import KoaRouter from 'koa-router';
import KoaStatic from 'awesome-static';
import * as path from 'path';
import { RenderFromPage } from 'rmjac-core/service/render';
import { perm } from 'rmjac-core/declare/perm';
import { user } from 'rmjac-core/model/user';
import { Logger } from 'log4js';
import { runModel } from 'rmjac-config';
import { RError } from 'rmjac-core/declare/error';
import * as loggerInit from './logger';
import * as fs from 'fs';
import { Server } from 'socket.io';
import { createServer } from 'http';

export const app = new Koa();
const router = new KoaRouter();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('koa2-cors');

app.use(cors());
app.use(KoaBody());
app.use(bodyParser());
app.use(router.routes());
export const httpServer = createServer(app.callback());

export const io = new Server(httpServer, {
    cors: {
        origin: 'https://admin.socket.io',
        allowedHeaders: '*',
        credentials: true
    },
});


type KoaContext = Context;

function transWord(word: string) {
    const firstLetter = word.charAt(0);
    const firstLetterCap = firstLetter.toUpperCase();
    const remainingLetters = word.slice(1);
    return firstLetterCap + remainingLetters;
}

export class Handler {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx: Record<string, any> = {}; // need extends KoaContent
    id = -1;
    token = '';

    @perm('user', 'view')
    async get() {
        this.ctx.type = 'text/html';
        this.ctx.body = await RenderFromPage(await user.getHeader(this.id));
        return;
    }
}

async function handle(ctx: KoaContext, HandlerClass: any) {
    const body = (ctx.request as any).body;
    const method = ctx.method.toLowerCase();
    let operation = '';
    if (method === 'post' && body?.operation !== '') {
        operation = transWord(body.operation);
    }
    const h = new HandlerClass() as Handler;
    const args = {};
    h.ctx = ctx;
    h.token = ctx.cookies.get('token') || '';
    Object.assign(args, body);
    Object.assign(args, ctx.params);
    Object.assign(args, ctx.request.query);
    try {
        const steps = [method, ...(operation ? [`post${operation}`] : []), 'after'];
        let cur = 0;
        const length = steps.length;
        h.ctx.body = '';
        while (cur < length) {
            const step = steps[cur];
            cur++;
            if (typeof (h as Record<string, any>)[step] === 'function') {
                await (h as Record<string, any>)[step](args);
            }
        }
    } catch (err) {
        const tErr = err as RError;
        if (['perm', 'validation'].includes(tErr?.errorType)) {
            if (method === 'get' && tErr?.errorType === 'perm') {
                ctx.type = 'text/html';
                ctx.body = await RenderFromPage({
                    type: 'back',
                    template: 'Blocked',
                    allowAppeal: ctx.path === '/'
                });
            } else {
                ctx.body = JSON.stringify({
                    status: 'error',
                    type: tErr?.errorType,
                    param: tErr?.errorParam,
                });
            }
            ctx.response.status = 200;
        } else {
            console.error(err);
            ctx.body = JSON.stringify({
                status: 'error',
                error: err,
            });
            ctx.response.status = 500;
        }
    }
}

export function Route(name: string, link: string, Handler: any) {
    router.all(link, async (ctx: any, next: any) => {
        await handle(ctx, Handler);
        next();
    });
}

export async function applyPrepare(logger: Logger) {
    if (runModel.env === 'prod') {
        await app.use(
            KoaStatic(path.join(__dirname, '..', 'ui', 'dist', 'assets'), {
                route: 'assets',
            })
        );
    }
    loggerInit.apply(logger);
    await httpServer.listen(runModel.port);
    // await app.listen();
    logger.info(`Backend listen :${runModel.port}`);
    // Start ws server with ws.
}

export async function applyAfter(logger: Logger) {
    const handlerPath = path.join(__dirname, 'handler');
    const handlerDir = await fs.readdirSync(handlerPath);
    for (const pack of handlerDir) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const runTag = require(path.join(handlerPath, pack));
        if (typeof runTag.apply === 'function') {
            runTag.apply(logger);
            logger.info(`handler ${pack} loaded.`);
        }
    }
}
