export default interface Collection<T> {
  aggregate(pipeline: Array<object>): Promise<Array<T>>;
  deleteOne(query: object): Promise<T>;
  find(query: object): Promise<Array<T>>;
  findOne(query: object): Promise<T>;
  insertOne(document: T): Promise<T>;
}
