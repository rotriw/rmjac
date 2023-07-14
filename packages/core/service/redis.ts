import { Redis } from 'ioredis';

export class RedisService {
    redis: Redis;
    url: string;

    constructor(url) {
        this.url = url;
    }

    async init() {
        this.redis = new Redis(this.url);
    }

    async setjson(model, id, data, expired = -1) {
        if (expired === -1) {
            await this.redis.set(`${model}-${id}`, JSON.stringify(data));
        }
        await this.redis.set(`${model}-${id}`, JSON.stringify(data), 'EX', expired);
    }

    async getjson(model, id) {
        return JSON.parse((await this.redis.get(`${model}-${id}`)) || '{}');
    }

    async set(model, id, data, expired = -1) {
        if (expired === -1) {
            await this.redis.set(`${model}-${id}`, JSON.stringify(data));
        }
        await this.redis.set(`${model}-${id}`, JSON.stringify(data), 'EX', expired);
    }

    async get(model, id) {
        return await this.redis.get(`${model}-${id}`);
    }

    async delete(model, id) {
        return await this.redis.del(`${model}-${id}`);
    }
}

const url = global.Project.redis.url || 'redis://127.0.0.1:6379/';

export async function apply() {
    await rdis.init();
}

export const rdis = new RedisService(url);
