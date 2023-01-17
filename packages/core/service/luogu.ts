import fs from "fs";
import {LuoguDataModel} from "../model/luogu";

export class LuoguDataFetch {
    async findProblemData(problemData :string[]) {
        let data = global.RMJ.LuoguProblems.data;
        let len = problemData.length;
        let res = [];
        let LuoguData = new LuoguDataModel();
        for (let i = 0; i < len; i ++ ) {
            if (data[problemData[i]] === undefined) {
                await global.RMJ.LuoguProblems.uploadProblem(problemData[i], await LuoguData.getProblemName(problemData[i]));
            }
            res.push(data[problemData[i]]);
        }
        return res;
	}
	
	async findDifficultData(problemData :string[]) {
        let data = global.RMJ.LuoguProblems.diff;
        let len = problemData.length;
        let res = [];
        let LuoguData = new LuoguDataModel();
        for (let i = 0; i < len; i ++ ) {
            if (data[problemData[i]] === undefined) {
                await global.RMJ.LuoguProblems.uploadDiff(problemData[i], await LuoguData.getProblemDifficult(problemData[i]));
            }
            res.push(data[problemData[i]]);
        }
        return res;
	}
	
	async updateApageData(type :string, pageFrom :number, pageTo :number) {
        let LuoguData = new LuoguDataModel();
		for (let i = pageFrom; i <= pageTo; i++) {
			console.log(`[Update]Page${i} called.`);
			if (i % 3 == 1) {
				LuoguData.getPageDifficultWithNoAsync(type, i, (j) => {
				// console.log(j);
					j.map(item => {
						global.RMJ.LuoguProblems.uploadDiff(item.pid, item.diff);
					});
					console.log(`[Update]Page${i} updated.`);
				});
				await setTimeout(()=>{}, 2000);
				continue;
			}
			let j = await LuoguData.getPageDifficult(type, i);
			j.map(item => {
				global.RMJ.LuoguProblems.uploadDiff(item.pid, item.diff);
			});
			console.log(`[Update]Page${i} updated.`);
		}
	}
}

export async function apply(config) {
    global.RMJ.LuoguProblems = {};
    global.RMJ.LuoguProblemsDifficut = {};
    global.RMJ.LuoguProblems.uploadProblem = async function (pid: string, data: string) {
        global.RMJ.LuoguProblems.data[pid] = data;
        fs.writeFileSync(global.RMJ.LuoguProblems.pathprob || 'luogu.problem.local.json', JSON.stringify(global.RMJ.LuoguProblems.data));
	}
	global.RMJ.LuoguProblems.uploadDiff = async function (pid: string, data: string) {
        global.RMJ.LuoguProblems.diff[pid] = data;
    	fs.writeFileSync(global.RMJ.LuoguProblems.pathdiff || 'luogu.diff.local.json', JSON.stringify(global.RMJ.LuoguProblems.diff));
	}
	    
    global.RMJ.LuoguProblems.data = JSON.parse((await fs.readFileSync(global.RMJ.LuoguProblems.pathprob || 'luogu.problem.local.json')).toString());
    global.RMJ.LuoguProblems.diff = JSON.parse((await fs.readFileSync(global.RMJ.LuoguProblems.pathdiff || 'luogu.diff.local.json')).toString());
}
