import { Problem } from "./declare/problem";
import { RouterOps } from "./declare/router";

let problem_routers : Record<string, any> = {};

export async function handle_problem(url: string): Promise<Problem | ""> {
    for (let i in problem_routers) {
        let reg = new RegExp(i, "i");
        if (reg.test(url)) {
            let router_class = problem_routers[i];
            let router = new router_class();
            return await router.get_problem(url, reg.exec(url) || []);
        }
    }
    return "";
}

export function registerProblemRouter(base_url: string, ops: RouterOps, router_class: any) {
    problem_routers[base_url] = router_class;
}