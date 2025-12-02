import { JSDOM } from "jsdom";
import { Problem, ProblemStatement, ContentType } from "../../declare/problem.ts";
import { texToTypst } from 'tex-to-typst';

// Helper to convert LaTeX to Typst
// AtCoder uses MathJax, usually \( ... \) or \[ ... \] or <var>...</var>
// But raw HTML often has <var>x</var> or similar.
// Sometimes they use \( ... \) for inline math.
function convertLatexToTypst(latex: string): string {
    try {
        return texToTypst(latex).value;
    } catch (e) {
        return latex;
    }
}

function convertHtmlToTypst(element: Element): string {
    // Clone to avoid modifying original
    const clone = element.cloneNode(true) as Element;

    // Handle <var> tags -> $...$
    const vars = clone.querySelectorAll("var");
    vars.forEach(v => {
        v.textContent = `$${v.textContent}$`;
    });

    // Handle <pre> tags (code blocks)
    const pres = clone.querySelectorAll("pre");
    pres.forEach(p => {
        // Typst code block
        p.textContent = "\n```\n" + p.textContent + "\n```\n";
    });

    // Handle <h3>, <h4> etc -> Typst headings
    // But usually we process sections separately. 
    // If inside content:
    const headings = clone.querySelectorAll("h3, h4, h5");
    headings.forEach(h => {
        const level = parseInt(h.tagName.substring(1));
        const prefix = "=".repeat(level);
        h.textContent = `\n${prefix} ${h.textContent}\n`;
    });

    // Handle lists
    const uls = clone.querySelectorAll("ul");
    uls.forEach(ul => {
        const lis = ul.querySelectorAll("li");
        lis.forEach(li => {
            li.textContent = `- ${li.textContent}\n`;
        });
    });

    // Handle <br>
    const brs = clone.querySelectorAll("br");
    brs.forEach(br => {
        br.replaceWith("\n");
    });

    // Get text content and clean up
    let text = clone.textContent || "";
    
    // Basic cleanup
    text = text.replace(/\r\n/g, "\n");
    
    // Handle inline math \( ... \) -> $ ... $
    // Note: texToTypst might be needed if complex latex is used
    // Simple replacement for now, assuming AtCoder's simple math
    // AtCoder often uses <var> which we handled.
    // Sometimes they use \( ... \)
    text = text.replace(/\\\((.*?)\\\)/g, (match, p1) => `$${p1}$`);
    
    return text.trim();
}

export const parse = (html: string, url: string): Problem => {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    // Title usually: "A - Title" in span.h2
    const titleElement = doc.querySelector("span.h2");
    let title = titleElement?.textContent?.trim() || "";
    // Remove "A - " prefix if present
    title = title.replace(/^[A-Z]\s-\s/, "");

    // Time/Memory Limit
    const textContent = doc.body.textContent || "";
    const timeMatch = textContent.match(/Time Limit:\s*([\d\.]+)\s*sec/);
    const memoryMatch = textContent.match(/Memory Limit:\s*(\d+)\s*MB/);
    
    const time_limit = timeMatch ? parseFloat(timeMatch[1]) * 1000 : 2000;
    const memory_limit = memoryMatch ? parseInt(memoryMatch[1]) * 1024 : 256 * 1024;

    // Sections
    const taskStatement = doc.querySelector("#task-statement");
    const langEn = taskStatement?.querySelector("span.lang-en") || taskStatement; 
    
    const parts = langEn?.querySelectorAll("section") || [];
    const contents: ContentType[] = [];
    
    parts.forEach((part) => {
        const h3 = part.querySelector("h3");
        if (!h3) return;
        
        const sectionTitle = h3.textContent?.trim() || "";
        
        // Clone part to manipulate
        const clone = part.cloneNode(true) as HTMLElement;
        const cloneH3 = clone.querySelector("h3");
        if (cloneH3) cloneH3.remove();
        
        let typstContent = convertHtmlToTypst(clone);
        
        // Map section titles to standard identifiers if possible
        let iden = sectionTitle;
        if (sectionTitle.toLowerCase().includes("problem statement")) iden = "statement";
        else if (sectionTitle.toLowerCase().includes("constraints")) iden = "constraints";
        else if (sectionTitle.toLowerCase().includes("input")) iden = "input";
        else if (sectionTitle.toLowerCase().includes("output")) iden = "output";
        else if (sectionTitle.toLowerCase().includes("sample input")) iden = "sample_input"; // Will need special handling for samples?
        else if (sectionTitle.toLowerCase().includes("sample output")) iden = "sample_output";

        // For samples, we might want to keep them together or just store as is.
        // The current interface allows list of ContentType.
        
        contents.push({
            iden: iden,
            content: typstContent
        });
    });

    const problem_iden = url.split("/").pop() || "";

    const statement: ProblemStatement = {
        statement_source: "AtCoder",
        problem_source: "AtCoder",
        problem_iden: problem_iden,
        problem_statements: contents,
        time_limit,
        memory_limit
    };

    return {
        problem_source: "AtCoder",
        problem_iden: problem_iden,
        problem_name: title,
        problem_statement: [statement],
        creation_time: new Date().toISOString(),
        tags: []
    };
};


export interface Contest {
    id: string;
    name: string;
    url: string;
}

export const parseContests = (html: string): Contest[] => {
    const dom = new JSDOM(html);
    const doc = dom.window.document;

    const contests: Contest[] = [];

    const tables = doc.querySelectorAll('.table-responsive > table');
    
    tables.forEach(table => {
        const tbody = table.querySelector('tbody');
        if (!tbody) return;

        const rows = tbody.querySelectorAll('tr');
        rows.forEach(row => {
            const secondTd = row.querySelector('td:nth-child(2)');
            const link = secondTd?.querySelector('a');

            if (link && link.href) {
                const url = new URL(link.href, 'https://atcoder.jp').toString();
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
