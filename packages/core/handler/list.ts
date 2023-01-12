
import { Route } from "../handle"
import { param } from "../utils/decorate"
import {User, UserInterface} from "../model/user";
import {connect} from "mongoose";
import {Token} from "../model/token";
import {v4 as uuidv4} from 'uuid';

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
            msg: res
        }
    }

}

export function apply(ctx) {
    Route('listCreate', '/list', ListMangerHandler);
}
