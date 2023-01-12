
import { Route } from "../handle"
import { param } from "../utils/decorate"
import {User, UserInterface} from "../model/user";

import {sha512} from "js-sha512";
import {ProblemList} from "../model/list";
export class ListMangerHandler {
    async get() {

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
        let us = await User.find().checkToken(id, token);
        if (us === false) {
            return {
                status: 'failed',
                code: 403,
                error: `can't access ${id} token.`
            }
        }
        let newList = new ProblemList({
            listName: title,
            viewUser,
            manageUser,
            problemList,
            description
        });
        let res = await newList.save();
        return {
            status: 'success',
            code: 200,
            msg: 'done.'
        }
    }

    @param('id')
    @param('token')
    async postShow(id :number, token :string) {
        let us = await User.find().checkToken(id, token);
        if (us === false) {
            return {
                status: 'failed',
                code: 403,
                error: `can't access ${id} token.`
            }
        }
        let data = await ProblemList.find().UserData(id);
        return {
            status: 'success',
            code: 200,
            data
        }
    }

    @param('id')
    @param('token')
    @param('pid')
    @param('problem')
    async postUpdateproblem(id :number, token :string, pid :number, problem :Array<string>) {
        let us = await User.find().checkToken(id, token);
        if (us === false) {
            return {
                status: 'failed',
                code: 403,
                error: `can't access ${id} token.`
            }
        }
        console.log(await ProblemList.find().checkPerm(id, pid));
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
}

export function apply(ctx) {
    Route('list', '/list', ListMangerHandler);
}
