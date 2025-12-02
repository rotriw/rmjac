import { JSDOM } from "jsdom";

export const verifyAtcoderUser = async (
  handle: string,
  expectedTopcoderId: string
): Promise<boolean> => {
  const url = `https://atcoder.jp/users/${handle}`;
  const res = await fetch(url);

  if (!res.ok) {
    throw new Error(`Failed to fetch AtCoder user page for ${handle}`);
  }

  const html = await res.text();
  const dom = new JSDOM(html);
  const document = dom.window.document;

  const table = document.querySelector(".dl-table");
  if (!table) {
    throw new Error("Could not find the user information table on the page");
  }

  const rows = Array.from(table.querySelectorAll("tr"));
  for (const row of rows) {
    const th = row.querySelector("th");
    if (th && th.textContent?.trim() === "TopCoder") {
      const td = row.querySelector("td");
      if (td) {
        const actualTopcoderId = td.textContent?.trim();
        return actualTopcoderId === expectedTopcoderId;
      }
    }
  }

  throw new Error("Could not find TopCoder ID on the page");
};