import { perm } from '../declare/perm';
import { Handler, Route } from '../handle';
import { user } from '../model/user';
// import * as fs from 'fs';
// import * as path from 'path';
import { RenderFromPage } from '../service/render';

class MainPageHandler extends Handler {
    @perm('user', 'view')
    async get() {
        this.ctx.type = 'text/html';
        this.ctx.body = await RenderFromPage(await user.getHeader(this.id));
        return;
    }
}

export function apply() {
    Route('HomePage', '/', MainPageHandler);
}