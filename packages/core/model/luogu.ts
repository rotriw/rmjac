import * as puppeteer from "puppeteer";
import Timeout from 'await-timeout';
import axios from "axios";
import * as fs from "fs";

export class LuoguDataModel {
     async LuoguUserAccept(userid :number, cookie :string, privateStatus :boolean, awaitTime :number = 300) :Promise<any> {
        try {
			let fetchData = await axios({
				'method': 'get',
				'headers': {
					'x-luogu-type': 'content-only',
				},
				'url': `https://www.luogu.com.cn/user/${userid}`
			}) as any;
			let data = {
				TryData: [],
				AcceptData: [],
			}
			
			fetchData.data.currentData.passedProblems.map(item => data.AcceptData.push(item.pid));
			fetchData.data.currentData.submittedProblems.map(item => data.TryData.push(item.pid));
			return {
				status: 'success',
				data,
			};
        } catch(err) {
            return {
                status: 'failed',
                msg: err,
                data: {
                    TryData: [],
                    AcceptData: [],
                },
            };
        }
    }

    async getProblemName(pid :string) {
        try {
            let data = await axios({
                headers: {
                    'x-luogu-type': 'content-only'
                },
                url: `https://www.luogu.com.cn/problem/${pid}`
            });
            return data.data.currentTitle;
        } catch (err) {
            return undefined;
        }
    }

	async getProblemDifficult(pid: string) {
		try {
            let data = await axios({
                headers: {
                    'x-luogu-type': 'content-only'
                },
                url: `https://www.luogu.com.cn/problem/${pid}`
            });
            return data.data.currentData.problem.difficulty;
        } catch (err) {
            return undefined;
        }
	}

	async getPageDifficult(type: string, pageId: number) {
		try {
            let data = await axios({
                headers: {
                    'x-luogu-type': 'content-only'
                },
                url: `https://www.luogu.com.cn/problem/list?page=${pageId}`
            });
			return data.data.currentData.problems.result.map(item => Object.assign({}, {
				diff: item.difficulty,
				pname: item.title,
				pid: item.pid,
			}));
        } catch (err) {
            return undefined;
        }
	}

	async getPageDifficultWithNoAsync(type: string, pageId: number, recall: Function) {
		try {
			let typeCode = type === 'luogu' ? '' : `&type=${type}`;
            let data = await axios({
                headers: {
                    'x-luogu-type': 'content-only'
                },
                url: `https://www.luogu.com.cn/problem/list?page=${pageId}${typeCode}`
            });
			recall(data.data.currentData.problems.result.map(item => Object.assign({}, {
				diff: item.difficulty,
				pname: item.title,
				pid: item.pid,
			})));
        } catch (err) {
            return undefined;
        }
	}
};

