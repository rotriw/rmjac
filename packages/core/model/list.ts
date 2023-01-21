import * as mongoose from 'mongoose';
import {Model} from 'mongoose';
import {Counter} from "./counter";
// import {Token} from "./token";

const Schema = mongoose.Schema;

export interface ProblemListInterface {
    listName :string,
    viewUser :Array<number>,
    manageUser :Array<number>,
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
    ver :String,
});
interface ListHelpers {
    UserData(id: number): Promise<Array<object>>;
    checkPerm(id: number, pid :number): Promise<boolean>;
}


ProblemListSchema.query['UserData'] = async function(id :number) {
    return await this.find({viewUser:{$elemMatch:{$eq: id}}});
}


ProblemListSchema.query['checkPerm'] = async function(id :number, pid :number) {
    const ts = await this.findOne({id: pid});
    if (ts?.manageUser.includes(id)) {
        return true;
    }
    return false;
}

ProblemListSchema.pre('save', function (next) {
    Counter.findByIdAndUpdate({ _id: 'problemList' }, { $inc: { seq: 1 } }, { new: true, upsert: true }, function (error, counter) {
        if (error)
            return next(error);
        this.id = counter.seq;
        next();
    });
});
export const ProblemList = mongoose.model<ProblemListInterface, Model<ProblemListInterface, ListHelpers>>('ProblemList', ProblemListSchema);
