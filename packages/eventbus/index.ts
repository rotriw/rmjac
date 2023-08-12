/* eslint-disable @typescript-eslint/no-var-requires */
import { Logger } from 'log4js';
import { config, loaded } from 'rmjac-config'

export async function apply(logger: Logger) {
    if (config.server === 'main') {
        if (!loaded.includes('rmjac-web-prepare')) {
            logger.error('required loaded rmjac-web-prepare before eventbus.');
            return ;
        }
        await require('./main').apply(logger);
    } else {
        await require('./edge').apply(logger);
    }
}
