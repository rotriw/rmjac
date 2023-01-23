//from 0.0.0 -> 0.7.0

import {ProblemList} from "../model/list";
import {ListPerm} from "../model/perm";
import * as log4js from "log4js";


const loggerUpdated = log4js.getLogger('updated');
export async function apply() {
    loggerUpdated.level = global.RMJ.level;
    loggerUpdated.info(`->v0.7.0 database updated. viewUser, manageUser => PERM`);
    const oldData = await ProblemList.find({}).exec();
    const ListPERM = new ListPerm();

    for (const item of oldData) {
        loggerUpdated.info(`Handle PasteID:${item.id}`);
        const newItem = item;
        if (newItem.PERM === undefined) {
            newItem.PERM = new Map<string, {perm: number}>();
        }
        for (const j of item.viewUser) {
            if (j === null) {
                continue;
            }
            newItem.PERM.set(j.toString(), {perm: ListPERM.PERMAdd('view', 0)});
        }
        for (const j of item.manageUser) {
            if (j === null) {
                continue;
            }
            newItem.PERM.set(j.toString(), {perm: -1});
        }
        newItem.PERM.set('0', {perm: ListPERM.PERMAdd('view', 0)});
        newItem.save({
            w: 1
        });
        loggerUpdated.info(`Handle ${item.id} Done.`);
    }
}
