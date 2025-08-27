import { UserProp } from "../declare/user";
import { ContentType, Problem, ProblemRouter } from "../declare/problem";
import axios, { Axios } from "axios";
import { registerProblemRouter } from "../router";
import { JSDOM } from "jsdom";

function convertToTypst(value: string): string {
    
}

class CodeforcesContestProblemRouter extends ProblemRouter {
    fetch_tool: Axios;
    async get_problem(url: string, reg: string[]): Promise<Problem | ""> {
        let axios = this.fetch_tool;
        let raw_data = await axios.get(url);
        let data = raw_data.data;
        let $ = new JSDOM(data);
        let document = $.window.document;
        const time = Number.parseInt((document.querySelector('.time-limit') as Element).innerHTML.substr(53, 2), 10);
        const memory = Number.parseInt((document.querySelector('.memory-limit') as Element).innerHTML.substr(55, 4), 10);
        let problem_statements: ContentType[] = [];
        problem_statements.push({
            iden: `Statement`,
            content: convertToTypst(document.querySelector('.problem-statement')?.innerHTML || "");
        });
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
            }]
        };
        return res;
    }
}

registerProblemRouter("(|http(s|):\\/\\/)codeforces\\.com\\/contest\\/([0-9]{1,5})\\/problem\\/([0-9]{1,12}|[A-Z]{1,12})", {
    headless: false,
    login_require: false,
}, CodeforcesContestProblemRouter);