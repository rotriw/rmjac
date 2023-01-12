import * as mongoose from "mongoose";

let Schema = mongoose.Schema;

export interface UserInterface {
    username :string,
    pwdSHA512 :string,
    description :string,
    email :string,
    ConnectionAccount :Array<object>,
    id :number,
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

export const User = mongoose.model<UserInterface>('UserList', UserSchema);
