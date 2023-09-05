import { Logger } from 'log4js';
import { apply as applyConnect, socket} from './connect';
import { Restart, apply as applyVerified } from './verified';

export async function apply(logger: Logger) {
    await applyConnect(logger);
    await applyVerified(logger);
    socket?.on('disconnect', async () => {
        logger.warn('Disconnected. Waiting for reconnect');
        await Restart(logger);
    })
    setTimeout(() => {}, 1000000)
    socket?.emit('createProblem', {})
}
