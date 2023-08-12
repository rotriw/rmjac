
import { Logger } from 'log4js';
import { socket } from './connect';
import { config } from 'rmjac-config';

export let verified = false;

export async function Restart(logger: Logger) {
    logger.info('Waiting for connect & verified.');
    socket?.emit('admin-verified', config.serverPwd);
}

export async function apply(logger: Logger) {
    Restart(logger);
    socket?.on('admin-verified-success', () => {
        logger.info('Verified Success.');
        verified = true;
    });
    socket?.on('admin-verified-error', () => {
        logger.error('Verified Error, wrong server pwd.');
        verified = true;
    });
}
