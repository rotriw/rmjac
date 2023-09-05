import { io } from 'rmjac-web';
import { ProblemSchema, problem } from 'rmjac-core/model/problem';
import { config } from 'rmjac-config';


io.of('/edge').on('connection', (socket) => {
    socket.on('createProblem', async (problemData: Omit<ProblemSchema, 'pid'>) => {
        if (socket.handshake.auth.password !== config.serverPwd) {
            return ;
        }
    })
})