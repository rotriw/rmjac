import "https://deno.land/x/dotenv@v3.2.2/load.ts";
import { fetchUserSubmissions } from "../vjudge/codeforces/service/mod.ts";

async function main() {
  const userHandle = Deno.args[0];
  const apiKey = Deno.args[1];
  const apiSecret = Deno.args[2];

  if (!userHandle || !apiKey || !apiSecret) {
    console.error("Usage: deno run script/fetch_codeforces_submissions.ts <handle> <apiKey> <apiSecret>");
    Deno.exit(1);
  }

  try {
    const submissions = await fetchUserSubmissions(userHandle, apiKey, apiSecret);
    const filePath = `./data/codeforces/submissions/${userHandle}.json`;
    await Deno.mkdir(filePath.split("/").slice(0, -1).join("/"), { recursive: true });
    await Deno.writeTextFile(filePath, JSON.stringify(submissions, null, 2));
    console.log(`Successfully fetched and saved ${submissions.length} submissions to ${filePath}`);
  } catch (error) {
    console.error("Error fetching submissions:", error);
  }
}

if (import.meta.main) {
  main();
}