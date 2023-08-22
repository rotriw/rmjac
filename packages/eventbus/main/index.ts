import { random } from 'lodash';
import { Logger } from 'log4js';
import { config } from 'rmjac-config';
import { io } from 'rmjac-web';
import { logger } from 'rmjac-web/logger';
import {edgeList} from './task';


io.of('/edge').on('connection', (socket) => {

    socket.on('ping', () => {
        socket.emit('pong');
    })

    socket.on('admin-verified', (msg) => {
        if (socket.handshake.auth.times === undefined) {
            socket.handshake.auth.times = 0;
        }
        if (socket.handshake.auth.times > 5) {
            logger.warn(`Edge-Server ${socket.id}(IP: ${socket.conn.remoteAddress}) try 5 times error code. For secure reasons, giving a random result`);
            socket.handshake.auth.fakestatus = true;
            socket.emit(random(1, 6) <= 3 ? 'admin-verified-success' : 'admin-verified-error');
            return ;
        }
        if (msg === config.serverPwd) {
            socket.handshake.auth.status = true;
            edgeList.push(socket.id);
            logger.info(`Edge-Server ${socket.id}(IP: ${socket.conn.remoteAddress}) is verified and connected.`);
            socket.emit('admin-verified-success');
        } else {
            ++ socket.handshake.auth.times;
            socket.emit('admin-verified-error');
        }
    });

    socket.on('disconnect', () => {
        const index = edgeList.indexOf(socket.id);
        if (index !== -1) {
            logger.info(`Edge Server ${socket.id}(IP: ${socket.conn.remoteAddress}) is down.`);
            edgeList.splice(index, 1);
            // TODO: tasks required to reassign.
            logger.warn(`Edge Server ${socket.id}(IP: ${socket.conn.remoteAddress}).`);
        } else {
            logger.info(`Edge Server ${socket.id}(IP: ${socket.conn.remoteAddress}) is down (No verfied).`);
        }
    });

    // socket.on('qwq', (msg) => {
        // console.log(socket.handshake.auth);
        // console.log(msg);
        // console.log('qwq');
    // })
});

// io.of('/edge').on('connection', (socket) => {
// });

// eslint-disable-next-line @typescript-eslint/no-empty-function, @typescript-eslint/no-unused-vars
export async function apply(loggerI: Logger) {
}
