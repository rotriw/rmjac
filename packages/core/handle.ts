import Koa from 'koa';
import KoaBody from 'koa-body';
import KoaBodyParser from 'koa-bodyparser';
import KoaRouter from 'koa-router';
// import cors from 'koa2-cors';
import _ from 'lodash';

export const app = new Koa();
const router = new KoaRouter();

const cors = require('koa2-cors');
app.use(cors());
app.use(KoaBody());
app.use(KoaBodyParser());
app.use(router.routes());


interface KoaContext extends Koa.Context {
}

async function handle(ctx :KoaContext, Handler) {
    const body = ctx.request.body;
    const method = ctx.method.toLowerCase();
    let operation = '';
    if (method === 'post' && body?.operation !== '') {
        operation = _.capitalize(body.operation);
    }
    const h = new Handler();
    const args = {};
    Object.assign(args, body);
    Object.assign(args, ctx.params);
    console.log(args);
    try {
        let steps = [
            method,
            ...operation ? [
                `post${operation}`,
            ] : [], 'after',
        ]
        let cur = 0, length = steps.length;
        ctx.body = '';
        while (cur < length) {
            let step = steps[cur];
            cur ++;
            console.log(step);
            if (typeof h[step] === 'function') {
                let value = await h[step](args);
                if (value?.status) {
                    ctx.body += JSON.stringify(value);
                    ctx.response.status = value.code || 200;
                }
            }
        }
    } catch(err) {
        ctx.body = 'Errors' + err;
        ctx.response.status = 500;
    }
}

export function Route(name :string, link :string, Handler) {
    router.all(link, async (ctx, next) => {
        await handle(ctx, Handler);
    });
}

export function apply(config :any) {
    app.listen(config?.port || 8000);

}
