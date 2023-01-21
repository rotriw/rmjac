
import { Route } from "../handle"
import { param } from "../utils/decorate"
import {User, UserInterface} from "../model/user";
import {ProblemList, ProblemListInterface} from "../model/list";
import {LuoguDataFetch} from "../service/luogu";
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
                code: 403,
                error: `can't access ${id} token.`
            }
        }
        const newList = new ProblemList({
            listName: title,
            viewUser,
            manageUser,
            problemList,
            description
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
                code: 403,
                error: `can't access ${id} token.`
            }
        }
        const data = await ProblemList.find().UserData(id);
        return {
            status: 'success',
            code: 200,
            data
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
                code: 403,
                error: `can't access ${id} token.`
            }
        }
        const data :ProblemListInterface = await ProblemList.findOne({id: pid}).exec();
        const Fetcher = new LuoguDataFetch();
        const names = await Fetcher.findProblemData(data.problemList);
        const diff = await Fetcher.findDifficultData(data.problemList);
        const nData = {
            listName: data.listName,
            viewUser: data.viewUser,
            manageUser: data.manageUser,
            description: data.description,
            id: data.id,
            ver: data.ver,
            problemList: []
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
                code: 403,
                error: `can't access ${id} token.`
            }
        }
        if ((await ProblemList.find().checkPerm(id, pid)) == false) {
            return {
                status: 'failed',
                code: 403,
                error: `no access to change.`
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
                code: 403,
                error: `can't access ${id} token.`
            }
        }
        if ((await ProblemList.find().checkPerm(id, pid)) == false) {
            return {
                status: 'failed',
                code: 403,
                error: `no access to change.`
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
                code: 403,
                error: `can't access ${id} token.`
            }
        }
        if ((await ProblemList.find().checkPerm(id, pid)) == false) {
            return {
                status: 'failed',
                code: 403,
                error: `no access to change.`
            }
        }
        await ProblemList.findOneAndUpdate({id: pid}, {$set: {description: description}});
        return {
            status: 'success',
            code: 200,
        }
    }
}

export function apply() {
    Route('list', '/list', ListMangerHandler);
}
