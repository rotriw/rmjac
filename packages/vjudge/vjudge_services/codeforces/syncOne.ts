import { SyncTaskData } from "../../declare/task.ts";
import { fetchSubmissionWithId, checkLoginWithPassword } from "./service/submission.ts";
import { UniversalSubmission } from "../../declare/submission.ts";

export const token = async (task: SyncTaskData): Promise<any | null> => {
    const handle = task.vjudge_node.public.iden;
    const auth = task.vjudge_node.private.auth;
    const [id, contest_id] = task.range.split(":");
    const result = await fetchSubmissionWithId(handle, auth.Token || "", id, contest_id);
    return {
        event: "sync_done_success",
        data: [result],
    };
}

export const password = async (task: SyncTaskData): Promise<any | null> => {
    const handle = task.vjudge_node.public.iden;
    const auth = task.vjudge_node.private.auth;
    const [id, contest_id] = task.range.split(":");
    const token = await checkLoginWithPassword(handle, auth.Password || "");
    if (token === false) {
        return null;
    }
    const result = await fetchSubmissionWithId(handle, token, id, contest_id);
    return {
        event: "sync_done_success",
        data: [result],
    };
};

export const apikey = async (_task: SyncTaskData) => {
    return null;
};