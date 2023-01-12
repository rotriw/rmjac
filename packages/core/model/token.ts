import * as mongoose from 'mongoose';

let Schema = mongoose.Schema;

interface Token {
    uid: number,
    expire: number,
    token :string,
}

let TokenSchema = new Schema<Token>({
    uid: Number,
    expire: Number,
    token :String,
});


export const Token = mongoose.model<Token>('token', TokenSchema);
