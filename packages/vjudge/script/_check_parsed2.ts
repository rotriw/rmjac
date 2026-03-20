import fs from "node:fs";

const lines = fs.readFileSync("data/codeforces/handled/parsed/html_1.jsonl", "utf-8").split("\n");
let count = 0;
let hasContent = 0;
let renderHtml = 0;
for (const line of lines) {
  if (!line.trim()) continue;
  count++;
  const d = JSON.parse(line);
  const ps = d.problem_statement?.[0];
  const stmts = ps?.problem_statements;
  if (stmts && stmts.length > 0 && stmts[0].iden !== "render_html") {
    hasContent++;
    if (hasContent <= 3) {
      console.log("iden:", d.problem_iden, "page_source_len:", ps.page_source?.length, "stmts:", stmts.length);
    }
  } else {
    renderHtml++;
    if (renderHtml <= 2) console.log("render_html:", d.problem_iden, "page_source_len:", ps?.page_source?.length);
  }
}
console.log(`total: ${count}, hasContent: ${hasContent}, renderHtml: ${renderHtml}`);
