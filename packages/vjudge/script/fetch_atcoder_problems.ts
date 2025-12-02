import { fetchAllProblems } from "../vjudge/atcoder/service/mod.ts";
import { Problem } from "../declare/problem.ts";

async function main() {
  try {
    const problems: Problem[] = await fetchAllProblems();
    const filePath = `./data/atcoder/problems.json`;
    await Deno.mkdir(filePath.split("/").slice(0, -1).join("/"), { recursive: true });
    await Deno.writeTextFile(filePath, JSON.stringify(problems, null, 2));
    console.log(`Successfully fetched and saved ${problems.length} problems to ${filePath}`);
  } catch (error) {
    console.error("Error fetching AtCoder problems:", error);
  }
}

if (import.meta.main) {
  main();
}