import { Socket } from "socket.io-client";
import { VjudgeNode } from "@/declare/node.ts";
import { VjudgeSyncAllFunction, VjudgeSyncOneFunction, VjudgeSyncListFunction } from "@/declare/modules.ts";
import { UniversalSubmission } from "../declare/submission.ts";


interface SyncData {
    vjudge_node: VjudgeNode;
    user_id: number;
    range: string;
    ws_id: string | null;
    task_id?: number;
}

interface SyncRange {
    all: boolean;
    one: boolean;
    from: number;
    count: number;
    contest_id?: string;
}

const convertRange = (range: string): SyncRange => {
    if (range === "all") {
        return {
            all: true,
            one: false,
            from: 0,
            count: 0,
        }
    } else if (range.startsWith("from")) {
        const data = range.slice(4).split(":");
        return {
            all: false,
            one: false,
            from: parseInt(data[0]),
            count: parseInt(data[1]),
        }
    } else if (range.startsWith("recent")) {
        const data = range.slice(6);
        return {
            all: false,
            one: false,
            from: 1,
            count: parseInt(data),
        }
    } else if (range.startsWith("range")) {
        const data = range.slice(5).split(":");
        return {
            all: false,
            one: false,
            from: parseInt(data[0]),
            count: parseInt(data[1]) - parseInt(data[0]),
        }
    } else if (range.startsWith("one")) {
        const data = range.slice(3);
        const [id, contest_id] = data.split(":");
        return {
            all: false,
            one: true,
            from: parseInt(id),
            count: 1,
            contest_id: contest_id,
        }
    } else {
        throw new Error("Invalid range");
    }
}

export const run = async (data: SyncData, socket: Socket) => {
    const { vjudge_node, ws_id } = data;
    const platform = vjudge_node.public.platform.toLowerCase();
    const iden = data.vjudge_node.public.iden;
    const vjudge_mode = vjudge_node.public.remote_mode;
    const vjudge_method = vjudge_mode === "PublicAccount" ? "PUBLIC" : vjudge_mode === "SyncCode" ? "APIKEY" :  vjudge_node.private.auth.token ? "TOKEN" : "PASSWORD";
    try {
        const range = convertRange(data.range);
        let result: UniversalSubmission[] | UniversalSubmission | undefined = undefined;
        if (range.all) {
            LOG.info(`Syncing all submissions for ${iden} with ${vjudge_method}`);
            if (VJUDGE_USER[platform][`syncAll${vjudge_method}`]) {
                result = await (VJUDGE_USER[platform][`syncAll${vjudge_method}`] as VjudgeSyncAllFunction)(iden, vjudge_node.private.auth) || [];
            }
        } else if (range.one) {
            LOG.info(`Syncing one submission for ${iden} with id ${range.from} and contest id ${range.contest_id} with ${vjudge_method}`);
            if (VJUDGE_USER[platform][`syncOne${vjudge_method}`]) {
                result = await (VJUDGE_USER[platform][`syncOne${vjudge_method}`] as VjudgeSyncOneFunction)(iden, vjudge_node.private.auth, range.from, range.contest_id) || [];
            }
        } else if (range.from && range.count) {
            LOG.info(`Syncing list of submissions for ${iden} from ${range.from} to ${range.from + range.count} with ${vjudge_method} platform: ${platform}`);
            console.log(VJUDGE_USER[platform][`syncList${vjudge_method}`]);
            if (VJUDGE_USER[platform][`syncList${vjudge_method}`]) {
                result = await (VJUDGE_USER[platform][`syncList${vjudge_method}`] as VjudgeSyncListFunction)(iden, vjudge_node.private.auth, range.from, range.count) || [];
            }
        }
        console.log(result);
        if (result) {
            socket.emit("update_user_submission", {
                node_id: vjudge_node.node_id,
                result: result,
                ws_id
            });
        }
    } catch (e: any) {
        console.error(e);
        socket.emit("sync_done", {
            node_id: vjudge_node.node_id,
            result: false,
            message: e.toString(),
            ws_id
        });
    }
};

