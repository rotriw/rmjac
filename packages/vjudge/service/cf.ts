import { UserProp } from "../declare/user";
import { ContentType, Problem, ProblemRouter } from "../declare/problem";
import axios, { Axios } from "axios";
import { registerProblemRouter } from "../router";
import { JSDOM } from "jsdom";
import {connect, ConnectResult} from "puppeteer-real-browser";
import { convertCodeforcesDomToSampleGroup, convertCodeforcesDomToTypst } from "./codeforces/tools";
import { APIContestList } from "../declare/cf";
import {Root as ProblemStandingData } from "../declare/cf.problemID";
import fs from "fs";


class CodeforcesContestProblemRouter extends ProblemRouter {
    constructor(fetch_tool: ConnectResult) {
        super();
        this.fetch_tool = fetch_tool;
    }
    fetch_tool: ConnectResult;
    async get_problem(url: string, reg: string[]): Promise<Problem | ""> {
        let tools = this.fetch_tool;
        let new_tab = tools.page;
        let _ = await new_tab.goto(url);
        if (!(await new_tab?.content()).includes("problem-statement")) {
            await new_tab.clickAndWaitForNavigation("body");
        }
        let new_value = await new_tab.goto(url);
        let data = (await new_value.text());
        
        let $ = new JSDOM(data);
        let source_code = $.window.document.querySelector('.problemindexholder')?.innerHTML || "";
        let document = $.window.document;

        const time = Number.parseInt((document.querySelector('.time-limit') as Element).innerHTML.substr(53, 2), 10);
        const memory = Number.parseInt((document.querySelector('.memory-limit') as Element).innerHTML.substr(55, 4), 10);
        const problem_statements = convertCodeforcesDomToTypst($);
        
        let res: Problem = {
            problem_source: "Codeforces",
            problem_iden: `RmjCF${reg[3]}${reg[4]}`,
            problem_name: document.querySelector(".title")?.textContent?.trim() || "Unknown CF Problem",
            tags: [],
            creation_time: new Date().toISOString(), // todo
            problem_statement: [{
                problem_iden: `${reg[3]}${reg[4]}`,
                statement_source: "Codeforces",
                problem_source: "CF",
                problem_statements,
                time_limit: time * 1000,
                memory_limit: memory * 1024,
            }],
            sample_group: convertCodeforcesDomToSampleGroup($),
            source_code
        };
        return res;
    }

    async get_problem_page_html(url: string): Promise<string> {
        let tools = this.fetch_tool;
        let new_tab = tools.page;
        let _ = await new_tab.goto(url);
        if (!(await new_tab?.content()).includes("problem-statement")) {
            await new_tab.clickAndWaitForNavigation("body");
        }
        let new_value = await new_tab.goto(url);
        let data = (await new_value?.text());
        return data || "";
    }

    async local_get_problemID_of_contest(contest_id: string, file_path: string): Promise<string[]> {try {
        let axios_fetch = await axios.get(`https://codeforces.com/api/contest.standings?contestId=${contest_id}&from=1&count=1`);
        let data: ProblemStandingData = axios_fetch.data;
        fs.appendFileSync(file_path, JSON.stringify(data));
        let result: string[] = [];
        for (let problem of data.result.problems) {
            console.log('save problem:', `${contest_id}${problem.index}`);
            try {
                fs.appendFileSync(file_path, await this.get_problem_page_html(`https://codeforces.com/contest/${contest_id}/problem/${problem.index}`));
            } catch (e) {
                console.log(`errlr saving problem.${contest_id}`);
            }
        }
        return result;
        } catch(err) {
            console.log('error saving problem');
            return [contest_id];
        }
    }

    async local_discover_contest_problem(start_time: Date, file_path: string, thread = 1): Promise<string[]> {
        let axios_fetch = await axios.get("https://codeforces.com/api/contest.list");
        let cf_contests: APIContestList = axios_fetch.data;
        let result: string[] = [];
        // times = 10;
        let cnt = 0;
        let flag = false
        for (let contest of cf_contests.result) {
            let contest_time = new Date(contest.startTimeSeconds * 1000);
            if (contest_time >= start_time) {
                if (contest.phase != "BEFORE") {
                    result.push(contest.id.toString());
                }
            }
        }
        fs.appendFileSync(file_path, result.toString());
        return result;
    }

    async local_run(data: number[], file_path: string): Promise<string[]> {
        let result: string[] = [];
        console.log(`handle ${data.length} number.`);
        for (const id of data) {
            result = result.concat(await this.local_get_problemID_of_contest(id.toString(), file_path));
        }
        return result;
    
    }
}
async function start() {
    let a = new CodeforcesContestProblemRouter(await connect({
        headless: false,
        turnstile: false,
        args: [],
        disableXvfb: true,
        ignoreAllFlags: false,
        plugins: [require("puppeteer-extra-plugin-click-and-wait")()],
    }));
    let path = "./s.out";
    let datas = fs.readFileSync(path).toString();
    let datax: number[] = JSON.parse(datas);
    let exs = datax;
    // let value = await a.local_discover_contest_problem(new Date("0"), "./s.out");
    // console.log(value);
    a.local_run(exs, "./problem.txt");
    // await a.get_problem("https://codeforces.com/contest/1702/problem/A", ["","https://","codeforces.com","1702","A"]);
    // await 100ms
    //  await a.get_problem("https://codeforces.com/contest/1702/problem/B", ["","https://","codeforces.com","1702","B"]);
}

start();
registerProblemRouter("(|http(s|):\\/\\/)codeforces\\.com\\/contest\\/([0-9]{1,5})\\/problem\\/([0-9]{1,12}|[A-Z]{1,12})", {
    headless: true,
    login_require: false,
}, CodeforcesContestProblemRouter);