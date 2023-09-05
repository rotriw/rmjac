import {getLogger} from 'log4js';
import {AsyncTask, SimpleIntervalJob, ToadScheduler} from 'toad-scheduler';
import { runModel } from 'rmjac-config';


export class ScheduleService {
    tasks: Record<number, SimpleIntervalJob> = {};
    tasksID = 0;
    taskStatus: Record<number, number> = {};
    async addTask(func: () => Promise<number>, time: number ) {
        const nid = ++ this.tasksID;
        const loggerN = await getLogger(`task-${nid}`);
        loggerN.level = runModel.loglevel;
        const task = new AsyncTask(`task-${nid}`, async() => {
            try {
                const val = await func();
                if (val === -1) {
                    loggerN.warn('task run failed.');
                } else {
                    loggerN.info(`task run successful and return ${val}.`);
                }
            } catch(err) {
                loggerN.warn('task runtime error.');
                loggerN.warn(err);
            }
        })
        loggerN.info('task registered');
        const job = new SimpleIntervalJob({ seconds: time, }, task);
        scheduler.addSimpleIntervalJob(job);
        this.tasks[nid] = job;
        this.taskStatus[nid] = 1;
    }

    stopTask(id: number) {
        if (this.taskStatus[id])
            this.tasks[id]?.stop();
        this.taskStatus[id] = 0;
    }
}

export const scheduler = new ToadScheduler();
export const schedules = new ScheduleService();

// eslint-disable-next-line @typescript-eslint/no-empty-function
export async function apply() {

}
