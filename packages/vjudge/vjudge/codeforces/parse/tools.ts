// @ts-nocheck

import {
    JSDOM
} from "jsdom";
import "./defined.ts";
import { tex2typst } from 'tex2typst';
import { classNameReflect } from "./defined.ts";
import { ContentType } from "../../../declare/problem.ts";
import TurndownService from 'turndown';
import { markdownToTypstCode } from "@mdpdf/mdpdf";
import { nodeListMutatorSym } from "https://deno.land/x/deno_dom@v0.1.56/src/dom/node-list.ts";

export function convertLatexToTypst(data: string): string {
    return texToTypst(
        data
    ).value;
}


const convertCSS = (value: Element): string => {
    for (let val in classNameReflect) {
        let reg = classNameReflect[val];
        let specfic = value.querySelectorAll(`.${val}`);
        for (let child of specfic) {
            child.outerHTML = `${reg[0]}${child.innerHTML}${reg[1]}`;
        }
    }
    return value;
}

const convertEasyHTMLToTypst = async(res: string): string => {
    const turndownService = new TurndownService({ option: 'value' });
    turndownService.addRule('typstMath', {
        filter: ['typst'],
        replacement: function (content, node, options) {
            return '%typststart%' + node.innerHTML + '%typstend%'
        }
    });
    turndownService.addRule('image', {
        filter: ['img'],
        replacement: function (content, node, options) {
            console.log(node.innerHTML);
            return '%imgstart%' + node.src + '%imgdone%'
        }
    });
    turndownService.addRule('center', {
        filter: ['center'],
        replacement: function (content, node, options) {
            console.log(node.innerHTML);
            return '<center>' + content + '</center>'
        }
    });
    turndownService.addRule('p to new line', {
        filter: ['p'],
        replacement: function (content, node, options) {
            console.log(node.innerHTML);
            return content + '\n\n'
        }
    });
    turndownService.addRule('small', {
        filter: ['small'],
        replacement: function (content, node, options) {
            console.log(node.innerHTML);
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
    console.log(res);
    return res;
}

function putPrimeBeforeUnderscore(text) {
    return text.replace(/([\\\w]+|\{.*?\})_([\\\w]+|\{.*?\})'/g, "$1'_$2");
}

export const customTexMacros = {
    "\\RR": "\\mathbb{R}",
    "\\NN": "\\mathbb{N}",
    "\\ZZ": "\\mathbb{Z}",
    "\\QQ": "\\mathbb{Q}",
    "\\CC": "\\mathbb{C}",
    "\\sech": "\\operatorname{sech}",
    "\\csch": "\\operatorname{csch}",
    "\\dim": "\\operatorname{dim}",
    "\\id": "\\operatorname{id}",
    "\\im": "\\operatorname{im}",
    "\\Pr": "\\operatorname{Pr}",
};

// @param input: string of TeX math formula code.
export function convertTex2Typst(input, options = {}) {
    const opt = {
        nonStrict: true,
        preferTypstIntrinsic: true,
        customTexMacros: customTexMacros,

    };
    Object.assign(opt, options);
    input = putPrimeBeforeUnderscore(input);
    input = input.replaceAll(/\\color{(.*?)}{(.*?)}/g, (_match, p1, p2) => `\\color{${p1}\\%colorstop\\%}{${p2}\\%textstop\\%}`);
    console.log(input);
    let res = tex2typst(input, opt);
    res = res.replaceAll(/color (.*?) % c o l o r s t o p % (.*?) % t e x t s t o p %/g, (_match, p1, p2) => {
        return `colored(#${p1.split(' ').join('')}, ${p2})`;
    });
    res = res.replaceAll(" thin dif", " dif");
    res = res.replaceAll('op("d")', "dif"); // \operatorname("d") -> dif
    res = res.replaceAll('over', "\/"); // \operatorname("d") -> dif
    
    return res;
}

const convertToEasyHTML = (value: Element): string => {
    // convert value center(if there are img and span with text-font-size-small), combine them.
    let res = value.innerHTML;
    res = res.replaceAll(/<br>/g, '\n');
    res = res.replaceAll(/&nbsp;/g, ' ');
    res = res.replaceAll(/&lt;/g, '<');
    res = res.replaceAll(/&gt;/g, '>');
    console.log(res);
    const regex = /\$\$\$(.*?)\$\$\$/gs;
    res = res.replaceAll(regex, function(_match, p1) {
        // console.log(p1);
        return `<typst>${convertTex2Typst(p1)}</typst>`;
    });
    console.log(res);
    res = res.replaceAll(/<typst>#none\^"(.*?)"<\/typst>/g, (_match, p1) => {
        console.log(p1);
        return `%footnote%${p1}%endfootnote%`;
    });
    console.log(res);
    return res;
}

const convertHTML = async (value: Element): string => {
    value = convertCSS(value);
    let lafootnote = value.querySelector('.statement-footnote');
    value.querySelector('.statement-footnote')?.remove();
    let res = convertToEasyHTML(value);
    res = await convertEasyHTMLToTypst(res);
    if (lafootnote) {
        let footnote = convertToEasyHTML(lafootnote);
        footnote = await convertEasyHTMLToTypst(footnote);
        console.log(footnote);
        footnote = footnote.replaceAll(/%footnote%(.*?)%endfootnote%/g, (_match, p1) => {
            console.log(p1);
            return `<comment>${p1}:`
        });
        footnote = footnote.split('<comment>');
        for (let i = 1; i < footnote.length; i++) {
            let parts = footnote[i].split(':');
            let content = parts.slice(1).join(':').trim();
            console.log(parts[0].trim(), content);
            res = res.replaceAll(`%footnote%${parts[0].trim()}%endfootnote%`, `#footnote[${content}]`);
        }
        console.log(footnote);
        // replace res $""^("*")$ with
    }
    // parse all footnotes.
    res = res.replaceAll(/%footnote%(.*?)%endfootnote%/g, (_match, p1) => {
        return `#footnote[Unknown footnote: ${p1}]`;
    });


    return res;
}

const convertCodeforcesDomToTypst = async ($: JSDOM): ContentType[] => {
    let content = $.window.document.querySelector('.problem-statement');
    if (content == null) {
        return [];
    }
    let now_content = content;
    let used_statement = false, unknown_id = 1;
    const result = [];
    for (let child of now_content.children) {
        console.log(child.nodeName);
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
    let samples = $.window.document.querySelectorAll('.sample-test');
    let res: [string, string][] = [];
    for (let sample of samples) {
        let inputs = sample.querySelectorAll('.sample-test .input');
        let outputs = sample.querySelectorAll('.sample-test .output');
        for (let i = 0; i < inputs.length; i++) {
            let input_pre = inputs[i].querySelector('pre');
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