import { handle_problem, registerProblemRouter } from "./router";
import { AtCoderRouter } from "./vjudge/atcoder/problem";

// Manually register since we are not running the full app
registerProblemRouter("atcoder.jp", { headless: false, login_require: false }, AtCoderRouter);

async function test() {
    const url = "https://atcoder.jp/contests/abc333/tasks/abc333_a";
    console.log(`Testing ${url}...`);
    const result = await handle_problem(url);
    console.log(JSON.stringify(result, null, 2));
}

test();