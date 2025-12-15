import { CodeforcesContext, verified } from "@/vjudge/codeforces/user.ts";
import process from "node:process";

async function testCodeforcesLogin() {
    const handle = process.env.U;
    if (!handle) {
        throw new Error("CODEFORCES_HANDLE is not set");
    }
    const context: CodeforcesContext = {
        method: "PASSWORD",
        auth: process.env.P || "",
    };
    const token = await verified(handle, context);
    console.log(token);
}

testCodeforcesLogin();