import { Socket } from "node:dgram";
import { TaskData } from "./declare/task.ts";

declare global {
    var taskHandlerMap: Record<string, Record<string, (task: any) => Promise<any>>>;
}

const task_handler = async (task: TaskData, socket: Socket) => {
    const { operation, platform, method } = task;
    if (global.taskHandlerMap[platform] && global.taskHandlerMap[platform][`${operation}${method}`]) {
        const res = await global.taskHandlerMap[platform][`${operation}${method}`](task);
        socket.emit(res.event, {
            user_id: task.user_id || undefined,
            ws_id: task.ws_id || undefined,
            task_id: task.task_id || undefined,
            submissions: res.data,
        });
    } else {
        LOG.error(`Task handler not found for ${platform} ${operation}${method}`);
    }
}

export {
    task_handler,
}