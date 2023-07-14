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