import * as puppeteer from "puppeteer";
import Timeout from 'await-timeout';
import axios from "axios";
import * as fs from "fs";

export class LuoguDataModel {
     async LuoguUserAccept(userid :number, cookie :string, privateStatus :boolean, awaitTime :number = 300) :Promise<any> {
        try {
            const timer = new Timeout();
            const browser = await puppeteer.launch({
                headless: true
            });
            const userPage = await browser.newPage();
            await userPage.goto(`https://www.luogu.com.cn/user/${userid}#practice`);
            timer.set(awaitTime * 1000, 'TimeOut');
            try {
                await userPage.waitForFunction(() => {
                    if (document.querySelectorAll('.problems').length >= 2) {
                        return true;
                    }
                    return false;
                })
            } finally {
                timer.clear();
            }
            timer.clear();
            const value = await userPage.evaluate(() => {
                let TryData = undefined, PassData = undefined, msgOf = '', status = 'success', data = {
                    TryData: [],
                    AcceptData: [],
                };
                for (let i in document.getElementsByClassName('card')) {
                    if (~document.getElementsByClassName('card')[i].innerHTML.search('尝试')) {
                        TryData = document.getElementsByClassName('card')[i];
                        break;
                    }
                }
                if (TryData === undefined) {
                    msgOf += '\n can`t find tried data';
                }
                for (let i in document.getElementsByClassName('card')) {
                    if (~document.getElementsByClassName('card')[i].innerHTML.search('已通过')) {
                        // find data
                        PassData = document.getElementsByClassName('card')[i];
                        break;
                    }
                }
                if (PassData === undefined) {
                    msgOf += '\n can`t find pass data';
                }
                if (TryData === undefined && PassData === undefined) {
                    msgOf += '\n can`t all data, plz check web running.';
                    status = 'failed';
                }
                if (status === 'failed') {
                    return {
                        status: status,
                        msg: msgOf,
                        data: data,
                    };
                }
                for (let problemId of TryData.getElementsByClassName('problem-id')) {
                    data.TryData.push(problemId.innerText);
                }
                for (let problemId of PassData.getElementsByClassName('problem-id')) {
                    data.AcceptData.push(problemId.innerText);
                }
                if (data.TryData.length + data.AcceptData.length === 0) {
                    msgOf += 'no any data';
                    status = 'failed';
                }
                return {
                    status,
                    msg: msgOf,
                    data,
                };
            });
            await browser.close();
            return value;
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

