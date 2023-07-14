import { fetch } from '../interfaces/data';

interface RegisterProp {
    email: string;
    grade: string;
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

interface LoginResponse extends Response {
    status: 'success' | 'error';
    msg?: string;
    type?: string;
    data?: {
        username: string;
        token: string;
    };
    param?: string;
}

interface RegisterResponse extends Response {
    status: 'success' | 'error';
    msg?: string;
    type?: string;
    data?: {
        id: number;
    };
    param?: string;
}

export const registerError: {
    [key: string]: string | undefined;
} = {
    duplicate: '已存在的 ',
    validation: '未通过验证的注册信息',
    unknown: '后端未知错误',
    default: '',
    name: '用户名',
    email: '邮箱'
};

export const loginError: {
    [key: string]: string | undefined;
} = {
    validation: '用户名或密码错误',
    unknown: '后端未知错误',
    default: '',
};

export async function handleRegister(userdata: RegisterProp): Promise<RegisterResponse> {
    const data = await fetch('register', 'create', userdata);
    return data;
}

export async function handleLogin(userdata: LoginProp): Promise<LoginResponse> {
    const data = await fetch('login', 'loginCheck', userdata);
    return data;
}