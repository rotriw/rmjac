import * as mongoose from 'mongoose';

let Schema = mongoose.Schema;

let ProblemListSchema = new Schema({
    listName :String,
    viewUser :[Number],
    manageUser :[Number],
    description :String,
    id :Number,
    problemList :[String],
    ver :String,
});

let CounterSchema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

const Counter = mongoose.model('counter', CounterSchema);

ProblemListSchema.pre('save', function (next) {
    let doc = this;
    Counter.findByIdAndUpdate({ _id: 'problemList' }, { $inc: { seq: 1 } }, { new: true, upsert: true }, function (error, counter) {
        if (error)
            return next(error);
        doc.id = counter.seq;
        next();
    });
});
export const ProblemList = mongoose.model('ProblemList', ProblemListSchema);
