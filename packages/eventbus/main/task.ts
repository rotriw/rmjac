import {
    ICompare,
    PriorityQueue,
} from '@datastructures-js/priority-queue';
import { io } from 'rmjac-web';
import {logger} from 'rmjac-web/logger';


interface TaskProp extends Record<string, string | number | Record<string, string | number>> {
    emit: string;
    props: Record<string, string | number>;
}

interface Tasks {
    priority: number;
    taskID: number;
    data: TaskProp;
}

const compareTask: ICompare<Tasks> = (a: Tasks, b: Tasks) => {
    if (a.priority === b.priority) {
        return a.taskID < b.taskID ? -1 : 1;
    }
    return a.priority < b.priority ? -1 : 1;
}


export const edgeList: string[] = [];
export const tasks = new PriorityQueue<Tasks>(compareTask);
export let taskID = 0;
export let nowTask = 0;
export const edgeTasks: Record<string, number[]> = {};
export const historyTasks: Record<number, TaskProp | null> = {};

export function popAll() {
    while (!tasks.isEmpty()) {
        nowTask ++;
        nowTask %= edgeList.length;
        const edgeID = edgeList[nowTask];
        if (edgeTasks[edgeID] === undefined) {
            edgeTasks[edgeID] = [];
        }
        try {
            const data = tasks.pop();
            // historyTasks[nowTask] = data;
            edgeTasks[edgeID].push(data.taskID);
            const Prop = data.data.props;
            Prop.taskID = data.taskID;
            io.of('/edge').to(edgeID).emit(data.data.emit, Prop);
        } catch (err) {
            logger.warn('tasks priority queue have pop error.');
            logger.warn(err);
        }
    }
}


// TODO: More important than reassign
export function delTask(id: number) {
    historyTasks[id] = null;
    // edge task delete but i don`t
}

export function addTask(priority: number, data: TaskProp) {
    ++ taskID;
    tasks.push({
        priority,
        taskID,
        data
    });
    popAll();
}


//TODO: Required do delTask first.
export function addTaskWithoutPop(priority: number, data: TaskProp) {
    ++ taskID;
    tasks.push({
        priority,
        taskID,
        data
    });
}

export function reassignTask(eid: string) {
    for (const i of edgeTasks[eid]) {
        if (historyTasks[i] === null) {
            continue;
        }
        addTaskWithoutPop(-1, historyTasks[i] as TaskProp);
    }
    edgeTasks[eid] = [];
    popAll();
}

export async function apply() {
    io.of('/edge').on('task-done', (taskID) => {
        delTask(taskID);
    })
}
