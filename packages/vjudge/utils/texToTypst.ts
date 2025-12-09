import { tex2typst } from 'tex2typst';

const putPrimeBeforeUnderscore = (text: string) => {
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
export function convertTex2Typst(input: string, options = {}) {
    const opt = {
        nonStrict: true,
        preferTypstIntrinsic: true,
        customTexMacros: customTexMacros,
    };
    Object.assign(opt, options);
    input = putPrimeBeforeUnderscore(input);
    input = input.replaceAll(/\\color{(.*?)}{(.*?)}/g, (_match, p1, p2) => `\\color{${p1}\\%colorstop\\%}{${p2}\\%textstop\\%}`);
    let res = tex2typst(input, opt);
    res = res.replaceAll(/color (.*?) % c o l o r s t o p % (.*?) % t e x t s t o p %/g, (_match, p1, p2) => {
        return `colored(#${p1.split(' ').join('')}, ${p2})`;
    });
    res = res.replaceAll(" thin dif", " dif");
    res = res.replaceAll('op("d")', "dif"); // \operatorname("d") -> dif
    res = res.replaceAll('over', "\/"); // \operatorname("d") -> dif
    return res;
}
