import mongodb, { OptionalId } from 'mongodb';
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

  async deleteOne(query: object): Promise<T> {
    const deletedItem = await this.findOne(query);
    await this.collection.deleteOne(query);
    return deletedItem;
  }

  async find(query: object): Promise<Array<T>> {
    const results = await this.collection.find(query).toArray() as Array<T>;
    return results;
  }

  async findOne(query: object): Promise<T> {
    const result = await this.collection.findOne(query) as T;
    return result;
  }

  async insertOne(document: T): Promise<T> {
    const result = await this.collection.insertOne(document as OptionalId<Document>);
    return this.collection.findOne({ _id: result.insertedId }) as T
  }

}
