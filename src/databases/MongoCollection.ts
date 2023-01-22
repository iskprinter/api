import mongodb, { Document, OptionalId } from 'mongodb';
import Collection from './Collection';

export default class MongoCollection<T extends object> implements Collection<T> {

  constructor(public TConstructor: new() => T , public collection: mongodb.Collection) {}

  async aggregate(pipeline: Array<object>): Promise<Array<T>> {
    const results = await this.collection.aggregate(pipeline).toArray();
    return results.map((r) => Object.assign(new this.TConstructor(), r)) as Array<T>;
  }

  async createIndex(keys: object): Promise<string> {
    return this.collection.createIndex({ ...keys });
  }

  async delete(query: object): Promise<T[]> {
    const deletedItems = await this.find(query);
    await this.collection.deleteMany(query);
    return Object.assign(new this.TConstructor(), deletedItems);
  }

  async deleteOne(query: object): Promise<T> {
    const deletedItem = await this.findOne(query);
    await this.collection.deleteOne(query);
    return Object.assign(new this.TConstructor(), deletedItem);
  }

  async find(query: object, options?: { projection: object }): Promise<Array<T>> {
    const results = await this.collection.find(query, {
      ...options,
      projection: {
        ...options?.projection,
        _id: 0
      }
    }).toArray();
    return results.map((r) => Object.assign(new this.TConstructor(), r));
  }

  async findOne(query: object): Promise<T> {
    const result = await this.collection.findOne(query, { projection: { _id: 0 }});
    return Object.assign(new this.TConstructor(), result);
  }

  async insertOne(document: T): Promise<T> {
    const insertResult = await this.collection.insertOne(document as OptionalId<Document>);
    const result = this.collection.findOne({ _id: insertResult.insertedId }, { projection: { _id: 0 }});
    return Object.assign(new this.TConstructor(), result);
  }

  async putMany(documents: Array<T>): Promise<Array<T>> {
    for (const document of documents) {
      await this.collection.updateOne(
        document as OptionalId<Document>,
        { $set: document},
        { upsert: true }
      );
    }
    const insertedDocs = [];
    for (const document of documents) {
      const insertedDoc = await this.collection.findOne(
        document as OptionalId<Document>,
        { projection: { _id: 0 }}
      );
      insertedDocs.push(insertedDoc);
    }
    return insertedDocs.map((r) => Object.assign(new this.TConstructor(), r));
  }

  async updateOne(query: object, document: Partial<T>): Promise<T> {
    const updateResult = await this.collection.updateOne(
      query,
      { $set: document },
      {upsert: true}
    );
    const result = this.collection.findOne({ _id: updateResult.upsertedId }, { projection: { _id: 0 }});
    return Object.assign(new this.TConstructor(), result);
  }

}
