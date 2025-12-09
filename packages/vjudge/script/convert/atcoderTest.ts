import { JSDOM } from "jsdom";
import { convertAtcoderEnglishDomToTypst, convertHTML } from "../../vjudge/atcoder/parse.ts";
import fs from "node:fs";

const testcases = fs.readdirSync("script/convert/testcase/atcoder");
async function main() {
    for (const testcase of testcases) {
        const html = fs.readFileSync(`./script/convert/testcase/atcoder/${testcase}`, "utf-8");
        const dom = new JSDOM(html);
        const document = dom.window.document;
        const typst = html.includes("<title>") ? await convertAtcoderEnglishDomToTypst(dom.window.document.querySelector("span.lang-en") as unknown as Element) : await convertHTML(document.querySelector(".problem-statement") as Element);
        console.log(`--------------${testcase}----START--------------`);
        console.log(typst);
        console.log(`--------------${testcase}----DONE--------------`);
    }
}

main();