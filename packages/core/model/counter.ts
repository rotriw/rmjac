import {Schema} from "mongoose";
import mongoose from "mongoose";


let CounterSchema = new Schema({
    _id: { type: String, required: true },
    seq: { type: Number, default: 0 }
});

export const Counter = mongoose.model('counter', CounterSchema);
