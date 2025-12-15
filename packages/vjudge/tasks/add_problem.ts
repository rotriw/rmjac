import { Socket } from "socket.io-client";

export const run = async (data: any, socket: Socket) => {
    LOG.info(`Received update_problem_statement for ${data.url}`);
    const problem = await VJUDGE_PROBLEM[data.platform].fetch?.(data.url);
    if (!problem) {
        LOG.error(`Failed to fetch problem: ${data.url}`);
        return;
    }
    const parsedProblem = await VJUDGE_PROBLEM[data.platform].parse?.(problem, data.url);
    if (!parsedProblem) {
        LOG.error(`Failed to parse problem: ${data.url}`);
        return;
    }
    socket.emit("create_problem", parsedProblem)
}