import { Log4js } from "log4js"

/* eslint-disable @typescript-eslint/no-explicit-any */
export type GlobalProjectProp = {
    env: 'prod' | 'dev' | string,
    loglevel: 'INFO' | 'DEBUG' | 'WARNING' | 'ERROR' | 'CRITIAL',
    config: string, // configPath
    core: string, // corePath
    version: string,
    port: string,
    currentVersion: string,
    CoreJSON?: object,
    log: any,
    service: any,
}

export type ConfigFile = {
    mongo: string,
    mongon: string,
    email: {
        from: string
    }
    server?: string,
    serverPwd?: string,
    smtp?: Record<string, {
        host: string,
        port: number,
        secure: true,
        auth: {
            user: string,
            pass: string
        }
    }>,
    salt: {
        salt: string,
        strength: number
    }
}

export type PackagesContent = {
    logger: Log4js,
    
}