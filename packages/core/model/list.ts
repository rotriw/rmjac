import * as mongoose from 'mongoose';
import {Model} from 'mongoose';
import {Counter} from "./counter";
import {ProblemListEvent} from "../declare/event";
import {ListPerm} from "./perm";
import {User} from "./user";
// import {Token} from "./token";

const Schema = mongoose.Schema;

export interface ProblemListInterface {
    listName :string,
    //@deprecated
    viewUser :Array<number>,
    //@deprecated
    manageUser :Array<number>,
    PERM: Map<string, {
       perm: number,
    }>,

    description :string,
    id :number,
    problemList :Array<string>,
    ver :string,
}

const ProblemListSchema = new Schema({
    listName :String,
    viewUser :[Number],
    manageUser :[Number],
    description :String,
    id :Number,
    problemList :[String],
    PERM: {
        type: Map,
        of: new Schema({
            perm: Number,
        })
    },
    ver :String,
});
interface ListHelpers {
    UserData(id: number): Promise<Array<object>>;
    checkPerm(id: number, pid :number, event :ProblemListEvent | 'set'): Promise<boolean>;
    getPerm(id: number, pid :number): Promise<Array<ProblemListEvent>>;
    getPermList(pid :number): Promise<Array<{
        uname: string,
        id: number,
        Perm: Array<ProblemListEvent>
    }>>;
}

ProblemListSchema.query['UserData'] = async function(id :number) {
    return await this.find({viewUser:{$elemMatch:{$eq: id}}});
}

const ListPERM = new ListPerm();

ProblemListSchema.query['getPerm'] = async function(id :number, pid :number) {
    const ts = await this.findOne({id: pid});
    const userPERM = ts.PERM.get(id)  || ts.PERM.get('0');
    return ListPERM.PERMGet(userPERM.perm);
}

ProblemListSchema.query['checkPerm'] = async function(id :number, pid :number, event :ProblemListEvent | 'set') {
    const ts = await this.findOne({id: pid});
	let userPERM = ts.PERM.get(id);
	if (userPERM === undefined) {
		userPERM = ts.PERM.get('0');
	}
    if (event === 'set') {
        return ListPERM.PERMCheck('description', userPERM.perm) ||
                ListPERM.PERMCheck('title', userPERM.perm) ||
                ListPERM.PERMCheck('user', userPERM.perm) ||
                ListPERM.PERMCheck('problem', userPERM.perm);
    }
    return ListPERM.PERMCheck(event as ProblemListEvent, userPERM.perm);
}

ProblemListSchema.query['getPermList'] = async function (pid :number): Promise<Array<{
    uname: string,
    id: number,
    Perm: Array<ProblemListEvent>
}>> {
    const _res = [];
    const ts = await this.findOne({id: pid});
    const PERMS :Map<string, {
        perm: number
    }> = ts.PERM;
    for (const i of PERMS.keys()) {
        const id = i;
        const Perm = ListPERM.PERMGet(PERMS.get(i).perm);
        let uname = '';
        if (i === '0') {
            uname = 'Public';
        } else {
            try {
                const uData = await User.findOne({id: i}).exec();
                uname = uData.username;
            } catch (err) {
                uname = 'error name';
            }
        }
        _res.push({
            id, Perm, uname
        });
    }
    return _res;
}
ProblemListSchema.pre('save', function (next, saveOptions) {
    const doc = this;
    if (saveOptions.w === 1) {
        next();
        return ;
    }
    Counter.findByIdAndUpdate({ _id: 'problemList' }, { $inc: { seq: 1 } }, { new: true, upsert: true }, function (error, counter) {
        if (error)
            return next(error);
        doc.id = counter.seq;
        next();
    });
});
export const ProblemList = mongoose.model<ProblemListInterface, Model<ProblemListInterface, ListHelpers>>('ProblemList', ProblemListSchema);
