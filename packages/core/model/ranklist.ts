import * as mongoose from 'mongoose';

export interface RankListItem {
    id: number,
    totalScore: number,
    state: [
        pid: string,
        score: number,
    ]
}

export interface RankListInformation  {
    pid: number, 
    data: RankListItem[]
}

const Schema = mongoose.Schema;

const RankListSchema = new Schema({
    pid: Number,
    data: []
});

RankListSchema.query['getInform'] = async function(id: number, pid: number) {

}