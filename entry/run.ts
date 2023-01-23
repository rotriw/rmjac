import * as fs from "fs";
import * as path from "path";
import * as log4js from "log4js";
import * as Updated from "./update";

interface RunModel {
    config :string,
    debug :boolean,
    loglevel :string,
    core :string,
    port: string,
    current: string,
}

// eslint-disable-next-line @typescript-eslint/no-var-requires
const argv :RunModel = require('yargs')
    .alias('c', 'config')
    .alias('l', 'log')
    .alias('d', 'debug')
    .alias('cv', 'current')
    .argv;
global.RMJ = {
    env: 'prod',
    loglevel: 'INFO',
    config : 'config.json',
    version: '',
    core: 'packages/core',
    currentVersion: '0',
    port: '8060'
};
if (argv.debug) {
    global.RMJ.env = 'dev';
    global.RMJ.loglevel = 'DEBUG';
}
if (argv.loglevel) {
    global.RMJ.loglevel = argv.loglevel;
}
if (argv.config) {
    global.RMJ.config = argv.config;
}
if (argv.core) {
    global.RMJ.core = argv.core;
}
if (argv.port) {
    global.RMJ.port = argv.port;
}
if (argv.current) {
    global.RMJ.currentVersion = argv.current;
}

async function run() {
    const logger = await log4js.getLogger('main');
    logger.level = global.RMJ.loglevel;
    global.RMJ.CoreJSON = JSON.parse((await fs.readFileSync(path.join(global.RMJ.core, 'package.json'))).toString());
    global.RMJ.log = {
        main: logger,
    }
    async function RunAll(packages, paths, type) {
        for (const pack in packages) {
            // eslint-disable-next-line @typescript-eslint/no-var-requires
            const runner = require(path.join(process.cwd(), paths, packages[pack]));
            runner.apply();
            logger.info(`${type} ${packages[pack]} Loaded.`);
        }
    }
    async function RunFile(pack, packname, type) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const runner = require(path.join(process.cwd(), pack));
        runner.apply();
        logger.info(`${type} ${packname} Loaded.`);
    }

    try {
        const files = await fs.readFileSync(global.RMJ.config);
        global.RMJ.config = JSON.parse(files.toString());
        const ServiceDir = await fs.readdirSync(path.join(global.RMJ.core, 'service'));
        await RunAll(ServiceDir, path.join(global.RMJ.core, 'service'), 'service');
        await Updated.run();
        await RunFile(path.join(global.RMJ.core, 'handle'), 'handle', 'handle');
        const Handler = await fs.readdirSync(path.join(global.RMJ.core, 'handler'));
        await RunAll(Handler, path.join(global.RMJ.core, 'handler'), 'handler');
   } catch (err) {
        console.log(err);
   }

}

run();
