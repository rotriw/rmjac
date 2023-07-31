/* eslint-disable */

import * as fs from 'fs';
import * as path from 'path';
import * as log4js from 'log4js';
import * as Updated from './update';
import { ConfigFile, RunModel, defaultRunModel } from 'rmjac-config';

const argv: RunModel = require('yargs').alias('c', 'config').alias('l', 'log').alias('d', 'debug').alias('cv', 'current').alias('t', 'test').argv;

const Run: RunModel = defaultRunModel;

Object.assign(Run, argv);

if (argv.debug) {
    Run.env = 'dev';
    Run.loglevel = 'DEBUG';
}

async function RunPackage(packageName: string) {
    const loggerName = packageName.startsWith('rmjac-') ? packageName.slice(6) : packageName;
    const logger = await log4js.getLogger(loggerName);
    logger.level = Run.loglevel;
    require(packageName).apply(logger, Run);
}

async function run() {
    RunPackage('rmjac-config'); // load config First.
}

await run();