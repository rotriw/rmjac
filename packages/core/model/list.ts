import * as mongoose from 'mongoose';
import {Model} from 'mongoose';
import {Counter} from "./counter";
import {Token} from "./token";

let Schema = mongoose.Schema;

interface ProblemListInterface {
    listName :string,
    viewUser :Array<number>,
    manageUser :Array<number>,
    description :string,
    id :number,
    problemList :Array<string>,
    ver :string,
}

let ProblemListSchema = new Schema({
    listName :String,
    viewUser :[Number],
    manageUser :[Number],
    description :String,
    id :Number,
    problemList :[String],
    ver :String,
});
interface ListHelpers {
    UserData(id: number): Promise<Array<object>>;
    checkPerm(id: number, pid :number): Promise<boolean>;
}

//@ts-ignore
ProblemListSchema.query.UserData = async function(id :number) {
    return await this.find({viewUser:{$elemMatch:{$eq: id}}});
}

//@ts-ignore
ProblemListSchema.query.checkPerm = async function(id :number, pid :number) {
    let ts = await this.findOne({id: pid});
    if (ts?.manageUser.includes(id)) {
        return true;
    }
    return false;
}

ProblemListSchema.pre('save', function (next) {
    let doc = this;
    Counter.findByIdAndUpdate({ _id: 'problemList' }, { $inc: { seq: 1 } }, { new: true, upsert: true }, function (error, counter) {
        if (error)
            return next(error);
        doc.id = counter.seq;
        next();
    });
});
export const ProblemList = mongoose.model<ProblemListInterface, Model<ProblemListInterface, ListHelpers>>('ProblemList', ProblemListSchema);
