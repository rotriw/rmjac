import { Logger } from 'log4js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let logger: Logger | Record<string, any> = {};

export function apply(loggerInit: Logger) {
    logger = loggerInit;
}