import { Redis } from 'ioredis';
import { config } from 'rmjac-config';

export class RedisService {
    redis: Redis;
    url: string;

    constructor(url: string) {
        this.url = url;
        this.redis = new Redis(this.url);
    }

    async setjson(model: string, id: string, data: object, expired = -1) {
        if (expired === -1) {
            await this.redis.set(`${model}-${id}`, JSON.stringify(data));
        }
        await this.redis.set(`${model}-${id}`, JSON.stringify(data), 'EX', expired);
    }

    async getjson(model: string, id: string) {
        return JSON.parse((await this.redis.get(`${model}-${id}`)) || '{}');
    }

    async set(model: string, id: string, data: string, expired = -1) {
        if (expired === -1) {
            await this.redis.set(`${model}-${id}`, data);
        }
        await this.redis.set(`${model}-${id}`, data, 'EX', expired);
    }

    async get(model: string, id: string): Promise<string | null> {
        return await this.redis.get(`${model}-${id}`);
    }

    async delete(model: string, id: string) {
        return await this.redis.del(`${model}-${id}`);
    }
}

const url = config.redis?.url || 'redis://127.0.0.1:6379/';


export const rdis = new RedisService(url);

// eslint-disable-next-line @typescript-eslint/no-empty-function
export async function apply() {

}