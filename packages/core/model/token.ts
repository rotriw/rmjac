import * as mongoose from 'mongoose';

const Schema = mongoose.Schema;

interface Token {
    uid: number,
    expire: number,
    token :string,
}

const TokenSchema = new Schema<Token>({
    uid: Number,
    expire: Number,
    token :String,
});


export const Token = mongoose.model<Token>('token', TokenSchema);
