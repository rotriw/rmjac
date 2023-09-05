
import { Logger } from 'log4js';
import { config } from 'rmjac-config';
import { Socket, io } from 'socket.io-client';


export let socket: undefined | Socket  = undefined;

export async function apply(logger: Logger) {
    try {
        socket = await io(`${config.serverlink}edge`);
        socket.emit('ping');
        socket.on('pong', () => {
            logger.info('Connected');
        })
    } catch(err) {
        logger.error('Connect Error.');
        logger.error(err);
    }
}
