import fs from "fs";
import {LuoguDataModel} from "../model/luogu";

export class LuoguDataFetch {
    async findData(problemData :string[]) {
        let data = global.RMJ.LuoguProblems.data;
        let len = problemData.length;
        let res = [];
        let LuoguData = new LuoguDataModel();
        for (let i = 0; i < len; i ++ ) {
            if (data[problemData[i]] === undefined) {
                await global.RMJ.LuoguProblems.upload(problemData[i], await LuoguData.getProblemName(problemData[i]));
            }
            res.push(data[problemData[i]]);
        }
        return res;
    }

}

export async function apply(config) {
    global.RMJ.LuoguProblems = {};
    global.RMJ.LuoguProblems.upload = async function (pid: string, data: string) {
        global.RMJ.LuoguProblems.data[pid] = data;
        fs.writeFileSync(global.RMJ.LuoguProblems.path || 'luogu.local.json', JSON.stringify(global.RMJ.LuoguProblems.data));
    }
    global.RMJ.LuoguProblems.data = JSON.parse((await fs.readFileSync(global.RMJ.LuoguProblems.path || 'luogu.local.json')).toString());
}
