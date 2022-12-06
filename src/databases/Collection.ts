export default interface Collection<T> {
  find(query: object): Promise<Array<T>>;
  aggregate(pipeline: Array<object>): Promise<Array<T>>;
  insertOne(document: T): Promise<T>;
}
