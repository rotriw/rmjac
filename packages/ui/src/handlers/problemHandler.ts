import { fetch } from '../interfaces/data';

interface RegisterProp {
    email: string;
    username: string;
    password: string;
    gender: string;
}

interface LoginProp {
    email: string;
    password: string;
}

interface Response {
    status: 'success' | 'error';
    msg?: string;
    type?: string;
    data?: unknown;
    param?: string;
}

export async function handleProblem(pid: string): Promise<any> {
    const data = await fetch('problem', 'view', { pid });
    return data;
}