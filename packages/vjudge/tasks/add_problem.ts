import { Socket } from "npm:socket.io-client@^4.8.1";
import { Problem } from "../declare/problem.ts";
import { handle_problem } from "../router.ts";

export const run = async (data: any, socket: Socket) => {
    LOG.info(`Received update_problem_statement for ${data.url}`);
    let res = await handle_problem(data.url) as Problem;
    res.creation_time = new Date().toISOString().slice(0, -1);
    console.log(JSON.stringify(res));
    socket.emit("create_problem", res)
}