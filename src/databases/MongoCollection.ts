import mongodb, { Document, OptionalId } from 'mongodb';
import Collection from './Collection';

export default class MongoCollection<T> implements Collection<T> {
  collection: mongodb.Collection<mongodb.Document>;

  constructor(collection: mongodb.Collection) {
    this.collection = collection;
  }

  async aggregate(pipeline: Array<object>): Promise<Array<T>> {
    const results = await this.collection.aggregate(pipeline).toArray() as Array<T>;
    return results;
  }

  async createIndex(keys: object): Promise<string> {
    return this.collection.createIndex({ ...keys });
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
    }).toArray() as Array<T>;
    return results;
  }

  async findOne(query: object): Promise<T> {
    const result = await this.collection.findOne(query, { projection: { _id: 0 }}) as T;
    return result;
  }

  async insertOne(document: T): Promise<T> {
    const result = await this.collection.insertOne(document as OptionalId<Document>);
    return this.collection.findOne({ _id: result.insertedId }, { projection: { _id: 0 }}) as T
  }

  async putMany(documents: Array<T>): Promise<Array<T>> {
    for (const document of documents) {
      await this.collection.updateOne(
        document as OptionalId<Document>,
        { $set: document},
        { upsert: true }
      );
    }
    const insertedDocs = new Array<T>();
    for (const document of documents) {
      const insertedDoc = await this.collection.findOne(
        document as OptionalId<Document>,
        { projection: { _id: 0 }}
      );
      insertedDocs.push(insertedDoc as T);
    }
    return insertedDocs;
  }

  async updateOne(query: object, document: Partial<T>): Promise<T> {
    const updateResult = await this.collection.updateOne(
      query,
      { $set: document },
      {upsert: true}
    );
    return this.collection.findOne({ _id: updateResult.upsertedId }, { projection: { _id: 0 }}) as T;
  }

}
