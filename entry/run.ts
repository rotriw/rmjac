import * as fs from 'fs';
import * as path from 'path';
import * as log4js from 'log4js';
import * as Updated from './update';

interface RunModel {
    config: string;
    debug: boolean;
    loglevel: string;
    core: string;
    port: string;
    current: string;
    test: boolean;
    noprepare: boolean;
    stopAfterTest: boolean;
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const argv: RunModel = require('yargs').alias('c', 'config').alias('l', 'log').alias('d', 'debug').alias('cv', 'current').alias('t', 'test').argv;
global.Project = {
    env: 'prod',
    loglevel: 'INFO',
    config: 'config.json',
    version: '',
    core: 'packages/core',
    currentVersion: '0',
    port: '8060',
    uiport: '5173',
};

Object.assign(global.Project, argv);

if (argv.debug) {
    global.Project.env = 'dev';
    global.Project.loglevel = 'DEBUG';
}

const ctxs = {};

async function run() {
    const logger = await log4js.getLogger('main');
    logger.level = global.Project.loglevel;
    global.Project.CoreJSON = JSON.parse((await fs.readFileSync(path.join(global.Project.core, 'package.json'))).toString());
    global.Project.log = {
        main: logger,
    };
    global.Project.redis = {};

    async function RunAll(packages, paths, type) {
        for (const pack in packages) {
            if (!packages[pack].endsWith('.ts') && !packages[pack].endsWith('.js')) {
                continue;
            }
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const runner = require(path.join(process.cwd(), paths, packages[pack]));
            if (type === 'service') {
                if (typeof runner['apply'] !== 'undefined') {
                    ctxs[packages[pack]] = await runner['apply'](ctxs);
                }
            } else {
                if (typeof runner['apply'] !== 'undefined') {
                    await runner['apply'](ctxs);
                }
            }
            logger.info(`${type} ${packages[pack]} Loaded.`);
        }
    }

    async function RunFile(pack, packname, type) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const runner = require(path.join(process.cwd(), pack));
        await runner.apply(ctxs);
        logger.info(`${type} ${packname} Loaded.`);
    }

    try {
        if (!argv.noprepare) {
            const files = await fs.readFileSync(global.Project.config);
            global.Project.config = JSON.parse(files.toString());
            const ServiceDir = await fs.readdirSync(path.join(global.Project.core, 'service'));
            await RunAll(ServiceDir, path.join(global.Project.core, 'service'), 'service');
            await Updated.run();
            await RunFile(path.join(global.Project.core, 'handle'), 'handle', 'handle');
            const Handler = await fs.readdirSync(path.join(global.Project.core, 'handler'));
            await RunAll(Handler, path.join(global.Project.core, 'handler'), 'handler');
        } else {
            logger.info('without prepare! do not use it in PROD.');
        }
        if (argv.test) {
            await require(path.join(process.cwd(), global.Project.core, 'test', 'index.js')); 
        }
    } catch (err) {
        console.error(err);
    }
}

run();
