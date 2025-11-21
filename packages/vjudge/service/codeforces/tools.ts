import {
    JSDOM
} from "jsdom";
import "./convert";
import { texToTypst } from 'tex-to-typst';
import { classNameReflect } from "./convert";
import { ContentType } from "../../declare/problem";

export function convertLatexToTypst(data: string): string {
    return texToTypst(
        data
    ).value;
}

const convertHTML = (value: Element): string => {

    for (let val in classNameReflect) {
        let reg = classNameReflect[val];
        let specfic = value.querySelectorAll(`.${val}`);
        for (let child of specfic) {
            child.innerHTML = `${reg[0]}${child.textContent}${reg[1]}`;
            child.classList.remove(val);
            child.outerHTML = child.innerHTML;
        }
    }
    let spans = value.querySelectorAll('span');
    for (let span of spans) {
        span.outerHTML = `#cf_span(class=[${span.className}], body=[${span.innerHTML}])`;
    }
    // save all other data.
    let others = value.querySelectorAll('*');
    for (let other of others) {
        let className = other.className;
        if (className == "") continue;
        other.outerHTML = `#cf_other(span=[${other.nodeName}], class=[${className}], body=[${other.innerHTML}])`;
    }
    let res = value.innerHTML;
    res = res.replace(/<br>/g, '\n');
    res = res.replace(/&nbsp;/g, ' ');
    let regex = /\$\$\$(.*?)\$\$\$/gs;
    res = res.replace(regex, function(match, p1) {
        return `$${convertLatexToTypst(p1)}$`;
    });
    return res;
}

const convertCodeforcesDomToTypst = ($: JSDOM): ContentType[] => {
    let content = $.window.document.querySelector('.problemindexholder');
    if (content == null) {
        return [];
    }
    let problem_statement = content.querySelector('.problem-statement')?.querySelectorAll('p');
    let statement = "";
    for (let value of problem_statement as NodeListOf<Element>) {
        statement += convertHTML(value) + "\n\n";
    }
    let input = "";
    let problem_input = content.querySelector('.input-specification')?.querySelectorAll('p');
    for (let value of problem_input as NodeListOf<Element>) {
        input += convertHTML(value) + "\n\n";
    }
    let output = "";
    let problem_output = content.querySelector('.output-specification')?.querySelectorAll('p');
    for (let value of problem_output as NodeListOf<Element>) {
        output += convertHTML(value) + "\n\n";
    }

    return [
        {
            iden: "statement", content: statement
        },
        {
            iden: "input", content: input
        },
        {
            iden: "output", content: output
        },

    ];
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
                    input_pre.innerHTML || "",
                    output_pre.innerHTML || ""
                ]);
            }
        }
    }
    return res;
}
export {
    convertCodeforcesDomToTypst,
    convertCodeforcesDomToSampleGroup
}