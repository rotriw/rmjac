import { Problem, ProblemRouter } from "../../declare/problem";
import { parse } from "./parse";
import { getPageContent } from "../../service/browser";

import { RouterOps } from "../../declare/router";

export class AtCoderRouter extends ProblemRouter {
    constructor(ops: RouterOps) {
        super(ops);
    }

    async get_problem(url: string, regex_match: string[]): Promise<Problem | ""> {
        try {
            const content = await getPageContent(url, this.ops.headless);
            if (!content) {
                return "";
            }
            return parse(content, url);
        } catch (e) {
            console.error(`Error fetching ${url}:`, e);
            return "";
        }
    }
}