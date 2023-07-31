import { Logger } from 'log4js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const logger: Logger | Record<string, any> = {};

export function apply(loggerInit: Logger) {
    Object.assign(logger, loggerInit);
}