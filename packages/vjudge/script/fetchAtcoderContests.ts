import { DOMParser, Element } from "https://deno.land/x/deno_dom/deno-dom-wasm.ts";
import * as fs from "https://deno.land/std@0.207.0/fs/mod.ts";
import * as path from "https://deno.land/std@0.207.0/path/mod.ts";

interface Contest {
    id: string;
    name: string;
    url: string;
}

const parseContests = (html: string): Contest[] => {
    const doc = new DOMParser().parseFromString(html, "text/html");
    if (!doc) {
        return [];
    }

    const contests: Contest[] = [];

    const tables = doc.querySelectorAll('.table-responsive > table');
    
    tables.forEach(table => {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const secondTd = row.querySelector('td:nth-child(2)');
            const link = secondTd?.querySelector('a');

            if (link && (link as Element).getAttribute('href')) {
                const href = (link as Element).getAttribute('href')!;
                const url = new URL(href, 'https://atcoder.jp').toString();
                const name = link.textContent?.trim() || '';
                const id = url.split('/').pop() || '';

                if (id && name) {
                    contests.push({ id, name, url });
                }
            }
        });
    });

    return contests;
};

const fetchAndSaveContests = async () => {
    try {
        const baseUrl = 'https://atcoder.jp/contests/archive';
        const firstPageResponse = await fetch(baseUrl);
        const firstPageHtml = await firstPageResponse.text();
        const doc = new DOMParser().parseFromString(firstPageHtml, "text/html");
        if (!doc) {
            console.error("Failed to parse the first page.");
            return;
        }

        const pageLinks = doc.querySelectorAll('.pagination li a');
        let lastPage = 1;
        pageLinks.forEach(link => {
            const pageNum = parseInt(link.textContent || '', 10);
            if (!isNaN(pageNum) && pageNum > lastPage) {
                lastPage = pageNum;
            }
        });

        console.log(`Found ${lastPage} pages of contests.`);

        let allContests: Contest[] = parseContests(firstPageHtml);

        for (let i = 2; i <= lastPage; i++) {
            console.log(`Fetching page ${i}...`);
            const response = await fetch(`${baseUrl}?page=${i}`);
            const html = await response.text();
            const contests = parseContests(html);
            allContests.push(...contests);
            await new Promise(resolve => setTimeout(resolve, 200));
        }

        const outputPath = path.join('data', 'atcoder_contests.json');
        // Ensure directory exists
        await fs.ensureDir(path.dirname(outputPath));
        await Deno.writeTextFile(outputPath, JSON.stringify(allContests, null, 2));

        console.log(`Successfully fetched and saved ${allContests.length} contests to ${outputPath}`);
    } catch (error) {
        console.error('Error fetching or saving contests:', error);
    }
};

fetchAndSaveContests();