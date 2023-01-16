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
};

