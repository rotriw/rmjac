import * as mongoose from "mongoose";
import {Query, Document, Model} from "mongoose";
import {Token} from "./token";
import {Counter} from "./counter";
import {LuoguDataFetch} from "../service/luogu";
import {LuoguDataModel} from "./luogu";

let Schema = mongoose.Schema;

export interface UserInterface {
    username :string,
    pwdSHA512 :string,
    description :string,
    email :string,
    ConnectionAccount :Array<any>,
    Accepted :any,
    id :number,
}

interface UserQueryHelpers {
    checkToken(id: number, token :string): Promise<boolean>;
    updateLuoguData(id: number, token :string): Promise<Array<any>>;
}


let UserSchema = new Schema<UserInterface>({
    username :String,
    pwdSHA512 :String,
    description :String,
    email :String,
    ConnectionAccount :Array,
    Accepted :Object,
    id :Number,
});

// @ts-ignore
UserSchema.query.checkToken = async function (id :number, token :string) : Promise<boolean> {
    let ts = await Token.findOne({uid: id, token});
    if (ts !== null) {
        return true;
    }
    return false;
}

// @ts-ignore
UserSchema.query.updateLuoguData = async function (id :number, token :string) : Promise<boolean> {
    let ts = await User.findOne({id, token}).exec();
    let oldData :any = {};
    if (ts.Accepted === undefined) {
        oldData = {'luogu': {}};
    } else {
        oldData = ts.Accepted;
    }
    let fetcher = new LuoguDataModel();
    for (let i in ts.ConnectionAccount) {
        if (ts.ConnectionAccount[i].type == 'luogu') {
            let nt = await fetcher.LuoguUserAccept(ts.ConnectionAccount[i].uid, '', false, 100);
			for (let i = 0; i < nt.data.AcceptData.length; i++) {
                let ov = oldData.luogu[nt.data.AcceptData[i]];
                if (ov === undefined || ov <= 1) {
                    oldData.luogu[nt.data.AcceptData[i]] = 100;
                }
            }
            for (let i = 0; i < nt.data.TryData.length; i ++ ) {
                let ov = oldData.luogu[nt.data.TryData[i]];
                if (ov === undefined || ov <= 0) {
                    oldData.luogu[nt.data.TryData[i]] = 1;
                }
            }
        }
    }
    await User.findOneAndUpdate({id}, {$set: {Accepted: oldData}});
}
UserSchema.pre('save', function (next) {
    let doc = this;
     Counter.findByIdAndUpdate({ _id: 'user' }, { $inc: { seq: 1 } }, { new: true, upsert: true }, function (error, counter) {
        if (error)
            return next(error);
        doc.id = counter.seq;
        next();
    });
});

export const User = mongoose.model<UserInterface, Model<UserInterface, UserQueryHelpers>>('UserList', UserSchema);
