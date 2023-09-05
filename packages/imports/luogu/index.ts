/* eslint-disable @typescript-eslint/no-explicit-any */
import MarkdownIt from 'markdown-it';
import * as fs from 'fs';
import { ProblemSchema, problem } from 'rmjac-core/model/problem';
import * as path from 'path';
import * as cliProgress from 'cli-progress';

function prid(ms: number) {
    if (ms >= 1000 * 60) {
        return `${(ms / 60000).toFixed(2)}min`
    }
    if (ms >= 1000) {
        return `${(ms / 1000).toFixed(2)}s`
    }
    return `${ms}ms`
}
function pridM(kb: number) {
    if (kb >= 1024 * 1024) {
        return `${(kb / 1024 / 1024).toFixed(2)}GB`
    }
    if (kb >= 1024) {
        return `${(kb / 1024).toFixed(2)}MB`
    }
    return `${kb}KB`
}

function getTime(list: Array<number>) {
    let min = 10000, max = 0;
    for (const d of list) {
        min = Math.min(min, +d);
        max = Math.max(max, +d);
    }
    if (min > max) {
        return '-';
    } else if (min === max) {
        return `${prid(min)}`
    } else {
        return `${prid(min)}~${prid(max)}`
    }
}

function getMem(list: Array<number>) {
    let min = 10000, max = 0;
    for (const d of list) {
        min = Math.min(min, +d);
        max = Math.max(max, +d);
    }
    if (min > max) {
        return '-';
    } else {
        return `${pridM(max)}`
    }
}

export async function ImportFile(code: any) {
    const tdata = code.dataRaw.currentData.problem;
    const md = new MarkdownIt();
    const data: Omit<ProblemSchema, 'pid'> = {
        title: tdata.title,
        version: {
            'luogu': {
                samples: tdata.samples.map((item: any) => {
                    return {
                        in: item[0],
                        out: item[1],
                    }
                }),
                background: md.render(tdata.background || ''),
                statement: md.render(tdata.description || ''),
                inFormer: md.render(tdata.inputFormat || ''),
                outFormer: md.render(tdata.outputFormat || ''),
                hint: md.render(tdata.hint || ''),
                showProp: ['background', 'statement', 'inFormer', 'outFormer', 'samples', 'hint']
            }
        },
        defaultVersion: 'luogu',
        sources: [
            {
                platform: 'luogu',
                pid: tdata.pid
            }
        ],
        sourceid: [`LG${tdata.pid}`],
        difficult: `Luogu / ${tdata.difficulty}`,
        memoryLimit: getMem(tdata.limits.memory),
        timeLimit: getTime(tdata.limits.time)
    };
    // eslint-disable-next-line no-console
    // console.log(data.version.luogu.samples);
    await problem.create(data);
    // eslint-disable-next-line no-console
    // console.log(`${tdata.title} updated.`);
}

export async function ReadDir(dir: string) {
    const pack = fs.readdirSync(dir);
    const bar1 = new cliProgress.SingleBar({}, cliProgress.Presets.shades_classic);
    bar1.start(pack.length, 0);
    let cnt = 0;
    for (const t of pack) {
        try {
            await ImportFile(JSON.parse(fs.readFileSync(path.join(dir, t)).toString()));
            cnt ++;
            bar1.update(cnt);
        } catch(err) {
            console.error(err);
        }
    }
    bar1.stop();
}
