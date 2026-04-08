import fs from "node:fs";
const lines = fs.readFileSync("data/codeforces/handled/parsed/html_0.jsonl", "utf-8").split("\n");
for (const line of lines) {
  if (!line.trim()) continue;
  const d = JSON.parse(line);
  const stmts = d.problem_statement?.[0]?.problem_statements;
  if (stmts && stmts.length > 1 && stmts[0].iden !== "render_html") {
    console.log("iden:", d.problem_iden);
    console.log("name:", d.problem_name);
    console.log("stmts count:", stmts.length);
    console.log("page_source len:", d.problem_statement[0].page_source?.length);
    console.log("first stmt (iden, len):", stmts[0].iden, stmts[0].content?.length);
    console.log("first content (200c):", stmts[0].content?.slice(0, 200));
    break;
  }
}
