import Koa, { Context } from 'koa';
import KoaBody from 'koa-body';
import bodyParser from 'koa-bodyparser';
import KoaRouter from 'koa-router';
import * as log4js from 'log4js';
import KoaStatic from 'awesome-static';
import * as path from 'path';
// import KoaConnect from 'koa-connect';
import { RenderFromPage } from './service/render';

export const app = new Koa();
const router = new KoaRouter();

// eslint-disable-next-line @typescript-eslint/no-var-requires
const cors = require('koa2-cors');

app.use(cors());
app.use(KoaBody());
app.use(bodyParser());
app.use(router.routes());

type KoaContext = Context;

function transWord(word: string) {
    const firstLetter = word.charAt(0);
    const firstLetterCap = firstLetter.toUpperCase();
    const remainingLetters = word.slice(1);
    return firstLetterCap + remainingLetters;
}

export class Handler {
    ctx: KoaContext;
    async get() {
        this.ctx.type = 'text/html';
        this.ctx.body = await RenderFromPage();
        return;
    }
}

async function handle(ctx: KoaContext, Handler) {
    const body = ctx.request.body;
    const method = ctx.method.toLowerCase();
    let operation = '';
    if (method === 'post' && body?.operation !== '') {
        operation = transWord(body.operation);
    }
    const h = new Handler();
    const args = {};
    h.ctx = ctx;
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
            if (typeof h[step] === 'function') {
                await h[step](args);
            }
        }
    } catch (err) {
        if (['perm', 'validation'].includes(err?.errorType)) {
            ctx.body = JSON.stringify({
                status: 'error',
                type: err?.errorType,
                param: err?.errorParam
            });
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

export function Route(name: string, link: string, Handler) {
    router.all(link, async (ctx, next) => {
        await handle(ctx, Handler);
        next();
    });
}

export async function apply() {
    const handleLogger = log4js.getLogger('handler');
    handleLogger.level = global.Project.loglevel;
    if (global.Project.env === 'prod') {
        await app.use(
            KoaStatic(path.join(__dirname, '..', 'ui', 'dist', 'assets'), {
                route: 'assets',
            })
        );
    }
    await app.listen(global.Project.port);
    handleLogger.info(`Backend listen :${global.Project.port}`);
}
