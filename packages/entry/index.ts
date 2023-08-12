/* eslint-disable */

import * as fs from 'fs';
import * as path from 'path';
import * as log4js from 'log4js';
// import * as Updated from './xas';
import { ConfigFile, RunModel, defaultRunModel, loaded } from 'rmjac-config';


const argv: RunModel = require('yargs').alias('c', 'config').alias('l', 'log').alias('d', 'debug').alias('cv', 'current').alias('t', 'test').argv;

const Run: RunModel = defaultRunModel;

Object.assign(Run, argv);

if (argv.debug) {
    Run.env = 'dev';
    Run.loglevel = 'DEBUG';
}

const loggerList: Record<string, log4js.Logger> = {};

async function RunPackage(packageName: string) {
    let loaded = '';
    if (packageName.endsWith('-after')) {
        loaded = 'After';
        packageName = packageName.slice(0,-6);
    }
    if (packageName.endsWith('-prepare')) {
        loaded = 'Prepare';
        packageName = packageName.slice(0,-8);
    }
    const loggerName = packageName.startsWith('rmjac-') ? packageName.slice(6) : packageName;

    const logger = loggerList[loggerName] ? loggerList[loggerName] : await log4js.getLogger(loggerName);
    logger.level = Run.loglevel;
    if (!loggerList[loggerName])
        loggerList[loggerName] = logger;
    try {
        return require(packageName)[`apply${loaded}`](logger, Run);
    } catch(err) {
        logger.error('can`t find module');
        logger.error(err);
    }
}

async function run() {
    const config: ConfigFile = await RunPackage('rmjac-config'); // load config First.
    for (const pack of config.load) {
        await RunPackage(pack);
        loaded.push(pack);
    }
}

run();
