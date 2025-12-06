import { Problem, ProblemRouter } from "../../declare/problem";
import { parse } from "./parse";
import { getPageContent } from "../../service/browser";
import { RouterOps } from "../../declare/router";

export class CodeforcesRouter extends ProblemRouter {
    constructor(ops: RouterOps) {
        super(ops);
    }

    async get_problem(url: string, iden: string[]): Promise<Problem | ""> {
        try {
            const content = await getPageContent(url, this.ops.headless);
            if (!content) {
                return "";
            }
            console.log(content);
            return parse(content, url);
        } catch (e) {
            LOG.error(`Error fetching ${url}:`, e);
            return "";
        }
    }
}