import * as fs from "fs";
import * as path from "path";
import * as log4js from "log4js";

interface RunModel {
    config :string,
    debug :boolean,
    loglevel :string,
    core :string,
    port: string,
};

let argv :RunModel = require('yargs')
    .alias('c', 'config')
    .alias('l', 'log')
    .alias('d', 'debug')
    .argv;
global.RMJ = {
    env: 'prod',
    loglevel: 'INFO',
    config : 'config.json',
    version: '',
    core: 'packages/core',
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

async function run() {
    var logger = log4js.getLogger('main');
    logger.level = global.RMJ.loglevel;
    global.RMJ.log = {
        main: logger,
    }
    async function RunAll(packages, paths, type) {
        for (let pack in packages) {
            let runner = require(path.join(process.cwd(), paths, packages[pack]));
            runner.apply();
            logger.info(`${type} ${packages[pack]} Loaded.`);
        }
    }
    async function RunFile(pack, packname, type) {
        let runner = require(path.join(process.cwd(), pack));
        runner.apply();
        logger.info(`${type} ${packname} Loaded.`);
    }

    try {
        let files = await fs.readFileSync(global.RMJ.config);
        global.RMJ.config = JSON.parse(files.toString());
        let ServiceDir = await fs.readdirSync(path.join(global.RMJ.core, 'service'));
        await RunAll(ServiceDir, path.join(global.RMJ.core, 'service'), 'service');
        await RunFile(path.join(global.RMJ.core, 'handle'), 'handle', 'handle');
        let Handler = await fs.readdirSync(path.join(global.RMJ.core, 'handler'));
        await RunAll(Handler, path.join(global.RMJ.core, 'handler'), 'handler');
   } catch (err) {
        console.log(err);
   }

}

run();
