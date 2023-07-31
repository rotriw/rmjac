import { Logger } from 'log4js'
import * as fs from 'fs'

export type SMTPConfig = {
    host?: string;
    port?: number;
    secure?: boolean;
    auth?: {
        user: string;
        pass: string;
    };
}

export type ConfigFile = {
    mongo: string,
    mongon: string,
    email: {
        from: string
    },
    server?: 'main' | 'edge',
    serverPwd?: string,
    smtp?: Map<string, SMTPConfig>,
    redis?: {
        url?: string
    },
    salt: {
        salt: string,
        strength: number
    }
}

export interface RunModel {
    env: string;
    config: string;
    debug?: boolean;
    version: string;
    loglevel: string;
    core: string;
    port: string | number;
    uiport: string | number;
    current?: string;
    currentVersion: string;
    test: boolean;
}

export const config: ConfigFile = {
    mongo: 'mongo://127.0.0.1:27107',
    mongon: 'rmjac',
    email: {
        from: 'noreply'
    },
    salt: {
        salt: 'xxxxx',
        strength: 8
    },
    server: 'main',
};

export const defaultRunModel: RunModel = {
    env: 'prod',
    loglevel: 'INFO',
    config: 'config.json',
    version: '',
    core: 'packages/core',
    currentVersion: '0',
    port: '8060',
    uiport: '5173',
    test: false
};

export const runModel: RunModel = defaultRunModel;

export function apply(logger: Logger, run: RunModel) {
    Object.assign(config, fs.readFileSync(run.config));
    Object.assign(runModel, run);
    logger.info('config file loaded.');
}