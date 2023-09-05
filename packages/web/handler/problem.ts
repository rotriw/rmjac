import { perm } from 'rmjac-core/declare/perm';
import { Handler, Route } from '../';
import { param } from 'rmjac-core/utils/decorate';
import { DefaultType } from 'rmjac-core/declare/type';
import { ProblemSchema, problem } from 'rmjac-core/model/problem';

class ProblemPageHandler extends Handler {
}

class ProblemHandler extends Handler {
    
    @perm('user', 'view')
    @param('pid', DefaultType.String) // psid
    async postView(pid: string) {
        const npid = await problem.getIdFromPSID(pid) || pid;
        const ndata = await problem.getObjectFromPID(npid.toString());
        
        if (ndata === undefined) {
            this.ctx.body = {
                status: 'error',
                data: {},
            }
        } else {
            this.ctx.body = {
                status: 'success',
                data: problem.contentToStandard(ndata as ProblemSchema)
            }
        }
    }
}


export function apply() {
    Route('ProblemPage', '/problem/:id', ProblemPageHandler);
    Route('ProblemPage', '/problem', ProblemHandler);
}