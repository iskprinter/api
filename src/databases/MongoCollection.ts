import mongodb, { Document, OptionalId } from 'mongodb';
import Collection from './Collection';
import log from 'src/tools/Logger';

export default class MongoCollection<T extends object> implements Collection<T> {

  constructor(public collection: mongodb.Collection) { }

  async aggregate(pipeline: Array<object>): Promise<Array<T>> {
    const results = await this.collection.aggregate(pipeline).toArray();
    return results as T[];
  }

  async createIndex(keys: object): Promise<string> {
    return await this.collection.createIndex({ ...keys });
  }

  async delete(query: object): Promise<T[]> {
    const deletedItems = await this.find(query);
    await this.collection.deleteMany(query);
    return deletedItems as T[];
  }

  async deleteOne(query: object): Promise<T> {
    const deletedItem = await this.findOne(query);
    await this.collection.deleteOne(query);
    return deletedItem;
  }

  async find(query: object, options?: { projection: object }): Promise<Array<T>> {
    const results = await this.collection.find(query, {
      ...options,
      projection: {
        ...options?.projection,
        _id: 0
      }
    }).toArray();
    return results as T[];
  }

  async findOne(query: object): Promise<T> {
    const result = await this.collection.findOne(query, { projection: { _id: 0 } });
    return result as T;
  }

  async insertOne(document: T): Promise<T> {
    const insertResult = await this.collection.insertOne(document as OptionalId<Document>);
    const result = await this.collection.findOne({ _id: insertResult.insertedId }, { projection: { _id: 0 } });
    return result as T;
  }

  async putMany(documents: Array<T>, query?: (document: T) => Partial<T>): Promise<Array<T>> {
    for (const document of documents) {
      await this.collection.updateOne(
        query ? query(document) : document,
        { $set: document },
        { upsert: true }
      );
    }
    const insertedDocs = [];
    for (const document of documents) {
      const insertedDoc = await this.collection.findOne(
        query ? query(document) : document,
        { projection: { _id: 0 } }
      );
      insertedDocs.push(insertedDoc);
    }
    return insertedDocs as T[];
  }

  async updateOne(query: object, document: Partial<T>): Promise<T> {
    await this.collection.updateOne(
      query,
      { $set: document },
      { upsert: true }
    );
    const result = await this.collection.findOne(document, { projection: { _id: 0 } });
    return result as T;
  }

}
