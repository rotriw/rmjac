import { AtCoderRouter } from "../problem.ts";
import { parseContests, Contest } from "../parse.ts";
import { Problem } from "../../../declare/problem.ts";
import axios from "axios";
import { JSDOM } from "jsdom";

const atcoderRouter = new AtCoderRouter();

export async function fetchAtCoderContests(): Promise<Contest[]> {
  const url = "https://atcoder.jp/contests/";
  try {
    const response = await axios.get(url);
    if (response.status !== 200) {
      console.error(`Failed to fetch ${url}: ${response.status}`);
      return [];
    }
    return parseContests(response.data);
  } catch (e) {
    console.error(`Error fetching ${url}:`, e);
    return [];
  }
}

export async function fetchProblemsFromContest(contestUrl: string): Promise<string[]> {
  try {
    const response = await axios.get(contestUrl);
    if (response.status !== 200) {
      console.error(`Failed to fetch ${contestUrl}: ${response.status}`);
      return [];
    }
    const dom = new JSDOM(response.data);
    const doc = dom.window.document;
    const links: string[] = [];
    const problemLinks = doc.querySelectorAll("tbody > tr > td:first-child > a");
    problemLinks.forEach(link => {
      if (link instanceof dom.window.HTMLAnchorElement) {
        links.push(new URL(link.href, "https://atcoder.jp").toString());
      }
    });
    return links;
  } catch (e) {
    console.error(`Error fetching problems from ${contestUrl}:`, e);
    return [];
  }
}

export async function fetchAllProblems(): Promise<Problem[]> {
  const contests = await fetchAtCoderContests();
  const allProblems: Problem[] = [];

  for (const contest of contests) {
    console.log(`Fetching problems from contest: ${contest.name}`);
    const problemUrls = await fetchProblemsFromContest(contest.url);
    for (const url of problemUrls) {
      const problem = await atcoderRouter.get_problem(url, []);
      if (problem) {
        allProblems.push(problem);
      }
    }
  }

  return allProblems;
}