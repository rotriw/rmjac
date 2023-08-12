/* eslint-disable @typescript-eslint/no-explicit-any */
import { Filter, MongoClient, UpdateFilter, Document as MongoDocument } from 'mongodb';
import { config } from 'rmjac-config';

class dbClass {
    url: string;
    dbname: string;
    options: any;
    LongTimeDB: any;

    constructor(url: string, dbname: string, options: any) {
        this.url = url;
        this.dbname = dbname;
        this.options = options;
        this.LongTimeDB = new MongoClient(this.url);
    }

    async insert(model: string, data: any[] | object, useLongTime = false) {
        let insertMore = false;
        if (Array.isArray(data)) {
            insertMore = true;
        }
        const client = useLongTime ? this.LongTimeDB : new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        insertMore ? await coll.insertMany(data as any[]) : await coll.insertOne(data);
        if (!useLongTime) client.close();
    }

    async getone(model: string, query: Filter<MongoDocument>, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.findOne(query, options);
        client.close();
        return res as any;
    }

    async getall(model: string, query: Filter<MongoDocument>, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.find(query, options).toArray();
        client.close();
        return res;
    }

    async update(model: string, where: Filter<MongoDocument>, data: any, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.updateOne(where, { $set: data }, options);
        client.close();
        return res;
    }

    async change(model: string, where: Filter<MongoDocument>, newdata: UpdateFilter<MongoDocument>, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.updateOne(where, newdata, options);
        client.close();
        return res;
    }

    async deleteOne(model: string, where: Filter<MongoDocument>, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.deleteOne(where, options)
        client.close();
        return res;
    }

    async deleteAll(model: string, where: Filter<MongoDocument>, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.deleteMany(where, options)
        client.close();
        return res;
    }

    async findIn(model: string, prop: string, find: string | number, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const query: Record<string, any> = {};
        query[prop] = {'$in': [find]};
        const res = await coll.find(query, options).toArray();
        client.close();
        return res;
    }

    async findOneIn(model: string, prop: string, find: string | number, useLongTime = false, options = {}) {
        const client = useLongTime ? this.LongTimeDB : new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const query: Record<string, any> = {};
        query[prop] = find;
        const res = await coll.findOne(query, options);
        if (!useLongTime) client.close();
        return res;
    }
}

const url = config.mongo;
const dbname = config.mongon;
const options = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};

export const db = new dbClass(url, dbname, options);
