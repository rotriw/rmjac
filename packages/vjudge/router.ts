import { Problem } from "./declare/problem";
import { RouterOps } from "./declare/router";
import { AtCoderRouter } from "./vjudge/atcoder/problem";
import { CodeforcesRouter } from "./vjudge/codeforces/problem";

let problem_routers: Record<string, { router_class: any, ops: RouterOps }> = {};

export async function handle_problem(url: string): Promise<Problem | ""> {
    for (let i in problem_routers) {
        let reg = new RegExp(i, "i");
        if (reg.test(url)) {
            console.log(`Using router for ${i} to handle ${url}`);
            const { router_class, ops } = problem_routers[i];
            let router = new router_class(ops);
            return await router.get_problem(url, reg.exec(url) || []);
        }
    }
    return "";
}

export function registerProblemRouter(base_url: string, ops: RouterOps, router_class: any) {
    problem_routers[base_url] = { router_class, ops };
}
registerProblemRouter("atcoder.jp", { headless: false, login_require: false }, AtCoderRouter);
registerProblemRouter("codeforces.com", { headless: true, login_require: false }, CodeforcesRouter);