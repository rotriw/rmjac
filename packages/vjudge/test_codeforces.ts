import { handle_problem } from "./router";
import * as log from "https://deno.land/std@0.224.0/log/mod.ts";

async function test() {
    const url = "https://codeforces.com/problemset/problem/1/A";
    const problem = await handle_problem(url);
    log.info(JSON.stringify(problem, null, 2));
}

test();