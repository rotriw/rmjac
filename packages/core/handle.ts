import Koa from 'koa';
import KoaBody from 'koa-body';
import KoaBodyParser from 'koa-bodyparser';
import KoaRouter from 'koa-router';
import _ from 'lodash';

export const app = new Koa();
const router = new KoaRouter();

app.use(KoaBody());
app.use(KoaBodyParser());
app.use(router.routes());

interface KoaContext extends Koa.Context {
}

function handle(ctx :KoaContext, Handler) {
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
        while (cur < length) {
            let step = steps[cur];
            cur ++;
            console.log(step);
            if (typeof h[step] === 'function') {
                h[step](args);
            }
        }
    } catch(err) {
        ctx.body = 'Errors' + err;
        ctx.response.status = 500;
    }
}

export function Route(name :string, link :string, Handler) {
    router.all(link, (ctx, next) => {
        handle(ctx, Handler);
    });
}

export function apply(config :any) {
    app.listen(config?.port || 8000);
}
