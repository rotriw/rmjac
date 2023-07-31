import { Logger } from 'log4js';
import * as fs from 'fs';
import * as path from 'path';
export async function apply(logger: Logger) {
    // console.log(path.join(__dirname, 'service'));
    const servicePath = path.join(__dirname, 'service');
    const ServiceDir = await fs.readdirSync(servicePath);
    for (const pack of ServiceDir) {
        // console.log(path.join(servicePath, pack));
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const runTag = require(path.join(servicePath, pack));
        if (typeof runTag.apply === 'function') {
            runTag.apply(logger);
            logger.info(`service ${pack} loaded.`);
        }
    }
}