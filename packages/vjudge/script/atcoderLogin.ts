import { loginWithPassword } from "../vjudge/atcoder/service/submission.ts";

async function main() {
    const handle = Deno.args[0];
    const password = Deno.args[1];
    const cookies = await loginWithPassword(handle, password);
    console.log(cookies);
}

main();