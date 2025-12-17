import { get_loc } from "../utils/cf_click.ts";

async function main() {
    const img = await Deno.readFile("assets/test2.png");
    const loc = await get_loc(new Uint8Array(img));
    console.log(loc);
}

main();