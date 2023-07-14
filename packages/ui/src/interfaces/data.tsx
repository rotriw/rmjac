import axios from 'axios';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function fetch(handler: string, operation: string, data: any) {
    data.operation = operation;
    const datas = await axios.post(`${window.web?.link || ''}/${handler}`, data);
    //TODO: Throw ERROR or handle error status.
    return datas.data;
}

export async function updateNewPageBackEndData(path: string) {
    const datas = await axios.get(`${window.web?.link || ''}${path}?onlyJSON`);
    window.web = datas;
    return ;
}