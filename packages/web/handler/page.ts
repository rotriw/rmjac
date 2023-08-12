import { perm } from 'rmjac-core/declare/perm';
import { Handler, Route } from '../';
import { user } from 'rmjac-core/model/user';
import { RenderFromPage } from 'rmjac-core/service/render';

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