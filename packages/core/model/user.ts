import * as mongoose from "mongoose";
import {Query, Document, Model} from "mongoose";
import {Token} from "./token";

let Schema = mongoose.Schema;

export interface UserInterface {
    username :string,
    pwdSHA512 :string,
    description :string,
    email :string,
    ConnectionAccount :Array<object>,
    id :number,
}

interface UserQueryHelpers {
    checkToken(id: number, token :string): Promise<boolean>;
}


let UserSchema = new Schema<UserInterface>({
    username :String,
    pwdSHA512 :String,
    description :String,
    email :String,
    ConnectionAccount :Array,
    id :Number,
});

let CounterSchema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

// @ts-ignore
UserSchema.query.checkToken = async function (id :number, token :string) : Promise<boolean> {
    let ts = await Token.findOne({uid: id, token});
    if (ts !== null) {
        return true;
    }
    return false;
}

const Counter = mongoose.model('counter', CounterSchema);

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
