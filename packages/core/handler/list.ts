
import { Route } from "../handle"
import { param } from "../utils/decorate"
import {User, UserInterface} from "../model/user";
import {ProblemList, ProblemListInterface} from "../model/list";
import {LuoguDataFetch} from "../service/luogu";
import {ListPerm} from "../model/perm";
import { ProblemListEvent } from "../declare/event";

const ListPERM = new ListPerm();
export class ListMangerHandler {
    async get() {
        return ;
    }
    @param('id')
    @param('token')
    @param('title')
    @param('description')
    @param('viewUser')
    @param('manageUser')
    @param('problemList')
    async postCreate(id :number, token :string, title :string, description :string,
     viewUser :Array<string>, manageUser :Array<string>,
     problemList :Array<string>) {
        const us = await User.find().checkToken(id, token);
        if (us === false) {
            return {
                status: 'failed',
                code: 200,
                error: `can't access ${id} token.`
            }
        }
        const PERM = new Map<string, {
            perm: number
        }>();
        PERM.set('0', {perm: 1});
        PERM.set(id.toString(),{perm: -1});
        const newList = new ProblemList({
            listName: title,
            viewUser,
            manageUser,
            problemList,
            description,
            PERM,
        });
        await newList.save();
        return {
            status: 'success',
            code: 200,
            msg: 'done.'
        }
    }

    @param('id')
    @param('token')
    async postShow(id :number, token :string) {
        const us = await User.find().checkToken(id, token);
        if (us === false) {
            return {
                status: 'failed',
                code: 200,
                error: `can't access ${id} token.`
            }
        }
        const data = await ProblemList.find().UserData(id);
        const res = data.map(item => {
            const it = item as {
                listName: string,
                id: string,
                problemList: string[]
            };
            return {
                listName: it.listName,
                id: it.id,
                problemListLength: it.problemList.length
            }
        });
        return {
            status: 'success',
            code: 200,
            data: res
        }
    }

    @param('id')
    @param('token')
    @param('pid')
    async postDetail(id :number, token :string, pid :number) {
        const us = await User.find().checkToken(id, token);
        if (us === false) {
            return {
                status: 'failed',
                code: 200,
                error: `can't access ${id} token.`
            }
        }
        const canView = await ProblemList.find().checkPerm(id, pid, 'view');
        const canSettings = await ProblemList.find().checkPerm(id, pid, 'set');
        const Perm = await ProblemList.find().getPerm(id, pid);
        if (!canView) {
            return {
                status: 'failed',
                code: 200,
                canView,
                canSettings,
                Perm,
                error: `no access to view.`
            }
        }
        const data :ProblemListInterface = await ProblemList.findOne({id: pid}).exec();
        const Fetcher = new LuoguDataFetch();
        const names = await Fetcher.findProblemData(data.problemList);
        const diff = await Fetcher.findDifficultData(data.problemList);
        const PermData = await ProblemList.find().getPermList(pid);
        const nData = {
            listName: data.listName,
            viewUser: data.viewUser,
            manageUser: data.manageUser,
            description: data.description,
            id: data.id,
            ver: data.ver,
            problemList: [],
            canView,
            canSettings,
            Perm,
            PermData
        };
        const dataPr = data.problemList;
        const dats :UserInterface = await User.findOne({id}).exec();
        const accepts = dats.Accepted || {'luogu': {}};
        for (let i = 0; i < dataPr.length; i ++ ) {
            nData.problemList.push({'id': dataPr[i], 'name': names[i], 'diff' : diff[i], 'score': accepts['luogu'][dataPr[i]] || 0});
        }
        return {
            status: 'success',
            code: 200,
            data: nData,
        }
    }

    @param('id')
    @param('token')
    @param('pid')
    @param('problem')
    async postUpdateProblem(id :number, token :string, pid :number, problem :Array<string>) {
        const us = await User.find().checkToken(id, token);
        if (us === false) {
            return {
                status: 'failed',
                code: 200,
                error: `can't access ${id} token.`
            }
        }
        if ((await ProblemList.find().checkPerm(id, pid, 'problem')) == false) {
            return {
                status: 'failed',
                code: 200,
                error: `no access to change problems.`
            }
        }
        await ProblemList.findOneAndUpdate({id: pid}, {$set: {problemList: problem}});
        return {
            status: 'success',
            code: 200,
        }
	}

	@param('id')
    @param('token')
    @param('pid')
    @param('title')
    async postUpdateTitle(id :number, token :string, pid :number, title :string) {
        const us = await User.find().checkToken(id, token);
        if (us === false) {
            return {
                status: 'failed',
                code: 200,
                error: `can't access ${id} token.`
            }
        }
        if ((await ProblemList.find().checkPerm(id, pid, 'title')) == false) {
            return {
                status: 'failed',
                code: 200,
                error: `no access to change title.`
            }
        }
        await ProblemList.findOneAndUpdate({id: pid}, {$set: {listName: title}});
        return {
            status: 'success',
            code: 200,
        }
	}

    @param('id')
    @param('token')
    @param('pid')
    @param('description')
    async postUpdateDescription(id :number, token :string, pid :number, description :string) {
        const us = await User.find().checkToken(id, token);
        if (us === false) {
            return {
                status: 'failed',
                code: 200,
                error: `can't access ${id} token.`
            }
        }
        if ((await ProblemList.find().checkPerm(id, pid, 'description')) == false) {
            return {
                status: 'failed',
                code: 200,
                error: `no access to change.`
            }
        }
        await ProblemList.findOneAndUpdate({id: pid}, {$set: {description: description}});
        return {
            status: 'success',
            code: 200,
        }
    }

    @param('id')
    @param('token')
    @param('pid')
    @param('perm')
    async postUpdatePERM(id :number, token :string, pid :number, perm :Array<{
        Perm: ProblemListEvent[],
        id: string
    }>) {
        const us = await User.find().checkToken(id, token);
        if (us === false) {
            return {
                status: 'failed',
                code: 200,
                error: `can't access ${id} token.`
            }
        }
        if ((await ProblemList.find().checkPerm(id, pid, 'user')) == false) {
            return {
                status: 'failed',
                code: 200,
                error: `no access to change problems.`
            }
        }
        const PERM = new Map<string, {
            perm: number
        }>();
        for (const q of perm) {
            PERM.set(q.id as string, { perm: ListPERM.PERMChange(q.Perm) });
        }
        await ProblemList.findOneAndUpdate({id: pid}, {$set: {PERM}});
        return {
            status: 'success',
            code: 200,
        }
    }
}

export function apply() {
    Route('list', '/list', ListMangerHandler);
}
