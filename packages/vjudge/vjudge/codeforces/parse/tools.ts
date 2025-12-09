// @ts-nocheck

import {
    JSDOM
} from "jsdom";
import "./defined.ts";
import { classNameReflect } from "./defined.ts";
import { ContentType } from "../../../declare/problem.ts";
import TurndownService from 'turndown';
import { markdownToTypstCode } from "@mdpdf/mdpdf";
import { convertTex2Typst } from "../../../utils/texToTypst.ts";

const convertCSS = (value: Element): string => {
    for (const val in classNameReflect) {
        const reg = classNameReflect[val];
        const specfic = value.querySelectorAll(`.${val}`);
        for (const child of specfic) {
            child.outerHTML = `${reg[0]}${child.innerHTML}${reg[1]}`;
        }
    }
    return value;
}

const convertEasyHTMLToTypst = async(res: string): string => {
    const turndownService = new TurndownService({ option: 'value' });
    turndownService.addRule('typstMath', {
        filter: ['typst'],
        replacement: function (_content, node, _options) {
            return '%typststart%' + node.innerHTML + '%typstend%'
        }
    });
    turndownService.addRule('image', {
        filter: ['img'],
        replacement: function (_content, node, _options) {
            return '%imgstart%' + node.src + '%imgdone%'
        }
    });
    turndownService.addRule('center', {
        filter: ['center'],
        replacement: function (content, node, _options) {
            return '<center>' + content + '</center>'
        }
    });
    turndownService.addRule('p to new line', {
        filter: ['p'],
        replacement: function (content, node, _options) {
            return content + '\n\n'
        }
    });
    turndownService.addRule('small', {
        filter: ['small'],
        replacement: function (content, node, _options) {
            return '%smallstart%' + content + '%smallend%'
        }
    });
    res = turndownService.turndown(res);
    res = await markdownToTypstCode(res);
    //delete typst tag.
    res = res.split('\n').filter(line => !line.startsWith('#set ') && !line.startsWith('#let ') && !line.startsWith('#show') && line.replaceAll(" ", "").length > 0).join('\n');
    res = res.replace(/<br>/g, '\n');
    res = res.replace(/&nbsp;/g, ' ');
    res = res.replace(/&lt;/g, '<');
    res = res.replace(/&gt;/g, '>');
    res = res.replaceAll(/%imgstart%(.*?)%imgdone%/g, (_match, p1) => {
            return `#figure(image("${p1.replaceAll('\\/', '/')}", width: 60%))`
    })
    res = res.replaceAll(/%smallstart%(.*?)%smallend%/g, (_match, p1) => {
            return `${p1}`
    })
    res = res.replaceAll(/%epigraph%(.*?)%endepigraph%/g, (_match, p1) => {
        return `#(epigraph.wrapper)[${p1}]`
    })
    res = res.replaceAll(/%epigraphtext%(.*?)%endepigraphtext%/g, (_match, p1) => {
        return `#(epigraph.text)[${p1}]`
    })
    res = res.replaceAll(/%epigraphsource%(.*?)%endepigraphsource%/g, (_match, p1) => {
        return `#(epigraph.source)[${p1}]`
    })
    res = res.replaceAll(/%typststart%(.*?)%typstend%/g, (_match, p1) => {
        return `$${p1.replaceAll('\\\\', '%xgg%').replaceAll('\\', '').replaceAll('%xgg%', '\\')}$`
    })

    res = res.replaceAll("\\_", "_");
    res = res.replaceAll("\\*", "*");
    res = res.replaceAll("\\#", "#");
    res = res.replaceAll("\\{", "{");
    res = res.replaceAll("\\}", "}");
    res = res.replaceAll("\\(", "(");
    res = res.replaceAll("\\)", ")");
    res = res.replaceAll("\\|", "|");
    return res;
}
const convertToEasyHTML = (value: Element): string => {
    let res = value.innerHTML;
    res = res.replaceAll(/<br>/g, '\n');
    res = res.replaceAll(/&nbsp;/g, ' ');
    res = res.replaceAll(/&lt;/g, '<');
    res = res.replaceAll(/&gt;/g, '>');
    const regex = /\$\$\$(.*?)\$\$\$/gs;
    res = res.replaceAll(regex, function(_match, p1) {
        return `<typst>${convertTex2Typst(p1)}</typst>`;
    });
    res = res.replaceAll(/<typst>#none\^"(.*?)"<\/typst>/g, (_match, p1) => {
        return `%footnote%${p1}%endfootnote%`;
    });
    return res;
}

const convertHTML = async (value: Element): string => {
    value = convertCSS(value);
    const lafootnote = value.querySelector('.statement-footnote');
    value.querySelector('.statement-footnote')?.remove();
    let res = convertToEasyHTML(value);
    res = await convertEasyHTMLToTypst(res);
    if (lafootnote) {
        let footnote = convertToEasyHTML(lafootnote);
        footnote = await convertEasyHTMLToTypst(footnote);
        footnote = footnote.replaceAll(/%footnote%(.*?)%endfootnote%/g, (_match, p1) => {
            return `<comment>${p1}:`
        });
        footnote = footnote.split('<comment>');
        for (let i = 1; i < footnote.length; i++) {
            const parts = footnote[i].split(':');
            const content = parts.slice(1).join(':').trim();
            res = res.replaceAll(`%footnote%${parts[0].trim()}%endfootnote%`, `#footnote[${content}]`);
        }
    }
    res = res.replaceAll(/%footnote%(.*?)%endfootnote%/g, (_match, p1) => {
        return `#footnote[Unknown footnote: ${p1}]`;
    });


    return res;
}

const convertCodeforcesDomToTypst = async ($: JSDOM): ContentType[] => {
    const content = $.window.document.querySelector('.problem-statement');
    if (content == null) {
        return [];
    }
    const now_content = content;
    const used_statement = false, unknown_id = 1;
    const result = [];
    for (const child of now_content.children) {
        if (child.nodeName === 'DIV') {
            if (child.classList.contains('header')) { // remove header.
                continue;
            }
            if (child.classList.contains('sample-test')) {
                continue;
            }
            let contest_title = "";
            for (const find_title of child.children) {
                if (find_title.classList.contains('section-title')) {
                    contest_title = find_title.textContent || "";
                    child.removeChild(find_title);
                    break;
                }
            }
            if (contest_title === "") {
                if (used_statement) {
                    contest_title = `Unknown Additional ${unknown_id}`;
                    unknown_id ++;
                } else {
                    contest_title = "statement";
                }
            }
            const content = await convertHTML(child);
            result.push({
                iden: contest_title.toLowerCase(),
                content
            });
        }
    }
    return result;
}

const convertCodeforcesDomToSampleGroup = ($: JSDOM): [string, string][] => {
    const samples = $.window.document.querySelectorAll('.sample-test');
    const res: [string, string][] = [];
    for (const sample of samples) {
        const inputs = sample.querySelectorAll('.sample-test .input');
        const outputs = sample.querySelectorAll('.sample-test .output');
        for (let i = 0; i < inputs.length; i++) {
            const input_pre = inputs[i].querySelector('pre');
            let divs = input_pre?.querySelectorAll('div');
            for (let div of divs as unknown as NodeListOf<Element>) {
                div.outerHTML = `${div.textContent}\n`;
            }
            let output_pre = outputs[i].querySelector('pre');
            divs = output_pre?.querySelectorAll('div');
            for (let div of divs as unknown as NodeListOf<Element>) {
                div.outerHTML = `${div.textContent}\n`;
            }
            if (input_pre && output_pre) {
                res.push([
                    (input_pre.innerHTML || "").replace(/<br\s*\/?>/gi, "\n").trim(),
                    (output_pre.innerHTML || "").replace(/<br\s*\/?>/gi, "\n").trim()
                ]);
            }
        }
    }
    return res;
}
export {
    convertCodeforcesDomToTypst,
    convertCodeforcesDomToSampleGroup,
    convertHTML
}