import { Socket } from "node:dgram";
import { TaskData } from "./declare/task.ts";

declare global {
    var taskHandlerMap: Record<string, Record<string, (task: any) => Promise<any>>>;
}

const task_handler = async (task: any, socket: Socket) => {
    const { operation, platform, method } = task;
    if (global.taskHandlerMap[platform] && global.taskHandlerMap[platform][`${operation}${method}`]) {
        const ntask = task as any;
        const nmethod = method || "";
        const res = await global.taskHandlerMap[platform][`${operation}${nmethod}`](task);
        let data;
        if (operation.startsWith("sync")) {
            data = { submissions: res.data };
        } else {
            data = { ...res.data };
        }
        console.log(task.user_id);
        socket.emit(res.event, {
            user_id: task.user_id || undefined,
            ws_id: task.ws_id || undefined,
            task_id: task.task_id || undefined,
            ...data,
        });
    } else {
        LOG.error(`Task handler not found for ${platform} ${operation}${method || ""}`);
    }
}

export {
    task_handler,
}