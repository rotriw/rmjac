import { fetchUserSubmissions } from "../vjudge/atcoder/service/mod.ts";

async function main() {
  const userHandle = Deno.args[0];
  if (!userHandle) {
    console.error("Usage: deno run script/fetch_atcoder_submissions.ts <userHandle>");
    Deno.exit(1);
  }

  try {
    const submissions = await fetchUserSubmissions(userHandle);
    const acceptedSubmissions = submissions.filter(s => s.result === "AC");
    
    const filePath = `./data/atcoder/submissions/${userHandle}.json`;
    await Deno.mkdir(filePath.split("/").slice(0, -1).join("/"), { recursive: true });
    await Deno.writeTextFile(filePath, JSON.stringify(acceptedSubmissions, null, 2));
    
    console.log(`Successfully fetched and saved ${acceptedSubmissions.length} accepted submissions to ${filePath}`);
  } catch (error) {
    console.error("Error fetching AtCoder submissions:", error);
  }
}

if (import.meta.main) {
  main();
}