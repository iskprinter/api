export default interface Collection<T> {
  aggregate(pipeline: Array<object>): Promise<Array<T>>;
  createIndex(keys: object): Promise<string>;
  delete(query: object): Promise<Array<T>>;
  deleteOne(query: object): Promise<T>;
  find(query: object, options?: { projection: object }): Promise<Array<T>>;
  findOne(query: object): Promise<T>;
  insertOne(document: T): Promise<T>;
  putMany(documents: Array<Partial<T>>, query?: (document: T) => Partial<T>): Promise<Array<T>>;
  updateOne(query: object, document: Partial<T>, ): Promise<T>;
}
