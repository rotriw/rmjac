import { Problem } from 'rmjac-declare/problem';
import { fetch } from '../interfaces/data';

interface ResponseProblem {
    status: 'success' | 'error';
    data?: Problem;
}

export async function handleProblem(pid: string): Promise<ResponseProblem> {
    const data = await fetch('problem', 'view', { pid });
    return data;
}