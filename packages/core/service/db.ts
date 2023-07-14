/* eslint-disable @typescript-eslint/no-explicit-any */
import { Filter, MongoClient, UpdateFilter } from 'mongodb';

class dbClass {
    url: string;
    dbname: string;
    options: any;

    constructor(url: string, dbname: string, options: any) {
        this.url = url;
        this.dbname = dbname;
        this.options = options;
    }

    async insert(model: string, data: [any] | object) {
        let insertMore = false;
        if (Array.isArray(data)) {
            insertMore = true;
        }
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        insertMore ? await coll.insertMany(data as [any]) : await coll.insertOne(data);
        client.close();
    }

    async getone(model: string, query: Filter<Document>, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.findOne(query, options);
        client.close();
        return res as any;
    }

    async getall(model: string, query: Filter<Document>, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.find(query, options).toArray();
        client.close();
        return res;
    }

    async update(model: string, where: Filter<Document>, data: any, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.updateOne(where, { $set: data }, options);
        client.close();
        return res;
    }

    async change(model: string, where: Filter<Document>, newdata: UpdateFilter<Document>, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.updateOne(where, newdata, options);
        client.close();
        return res;
    }

    async deleteOne(model: string, where: Filter<Document>, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.deleteOne(where, options)
        client.close();
        return res;
    }

    async deleteAll(model: string, where: Filter<Document>, options = {}) {
        const client = new MongoClient(this.url);
        const database = client.db(this.dbname);
        const coll = database.collection(model);
        const res = await coll.deleteMany(where, options)
        client.close();
        return res;
    }
}

const url = global.Project.config.mongo;
const dbname = global.Project.config.mongon || 'bx';
const options = global.Project.config.mongoconfig || {
    useNewUrlParser: true,
    useUnifiedTopology: true,
};

export const db = new dbClass(url, dbname, options);
