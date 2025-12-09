import { JSDOM } from "jsdom";
import { convertCodeforcesDomToTypst, convertHTML } from "../../vjudge/codeforces/parse/tools.ts";
import fs from "node:fs";

const testcases = fs.readdirSync("script/convert/testcase/codeforces");
async function main() {
    for (const testcase of testcases) {
        const html = fs.readFileSync(`./script/convert/testcase/codeforces/${testcase}`, "utf-8");
        const dom = new JSDOM(html);
        const document = dom.window.document;
        const typst = html.includes("<title>") ? await convertCodeforcesDomToTypst(dom) : await convertHTML(document.querySelector(".problem-statement") as Element);
        console.log(`--------------${testcase}----START--------------`);
        console.log(typst);
        console.log(`--------------${testcase}----DONE--------------`);
    }
}

main();