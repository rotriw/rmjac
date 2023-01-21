import * as mongoose from "mongoose";
import {Model} from "mongoose";
import {Token} from "./token";
import {Counter} from "./counter";
// import {LuoguDataFetch} from "../service/luogu";
import {LuoguDataModel} from "./luogu";

const Schema = mongoose.Schema;

export interface UserInterface {
    username :string,
    pwdSHA512 :string,
    description :string,
    email :string,
    ConnectionAccount :Array<any>,
    Accepted :Array<string>,
    id :number,
}

interface UserQueryHelpers {
    checkToken(id: number, token :string): Promise<boolean>;
    updateLuoguData(id: number, token :string): Promise<Array<any>>;
}


const UserSchema = new Schema<UserInterface>({
    username :String,
    pwdSHA512 :String,
    description :String,
    email :String,
    ConnectionAccount :Array,
    Accepted :Object,
    id :Number,
});

UserSchema.query['checkToken'] = async function (id :number, token :string) : Promise<boolean> {
    const ts = await Token.findOne({uid: id, token});
    if (ts !== null) {
        return true;
    }
    return false;
}

UserSchema.query['updateLuoguData'] = async function (id :number, token :string) : Promise<void> {
    const ts = await User.findOne({id, token}).exec();
    let oldData :any = {};
    if (ts.Accepted === undefined) {
        oldData = {'luogu': {}};
    } else {
        oldData = ts.Accepted;
    }
    const fetcher = new LuoguDataModel();
    for (const i in ts.ConnectionAccount) {
        if (ts.ConnectionAccount[i].type == 'luogu') {
            const nt = await fetcher.LuoguUserAccept(ts.ConnectionAccount[i].uid, '', false);
			for (let i = 0; i < nt.data.AcceptData.length; i++) {
                const ov = oldData.luogu[nt.data.AcceptData[i]];
                if (ov === undefined || ov <= 1) {
                    oldData.luogu[nt.data.AcceptData[i]] = 100;
                }
            }
            for (let i = 0; i < nt.data.TryData.length; i ++ ) {
                const ov = oldData.luogu[nt.data.TryData[i]];
                if (ov === undefined || ov <= 0) {
                    oldData.luogu[nt.data.TryData[i]] = 1;
                }
            }
        }
    }
    await User.findOneAndUpdate({id}, {$set: {Accepted: oldData}});
}
UserSchema.pre('save', function (next) {
     Counter.findByIdAndUpdate({ _id: 'user' }, { $inc: { seq: 1 } }, { new: true, upsert: true }, function (error, counter) {
        if (error)
            return next(error);
        this.id = counter.seq;
        next();
    });
});

export const User = mongoose.model<UserInterface, Model<UserInterface, UserQueryHelpers>>('UserList', UserSchema);
