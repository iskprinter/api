import Collection from './Collection';

export default interface Database {
  connect(): Promise<Database>;
  getCollection<T extends { new(): T }>(TConstructor: T, collectionName: string): Collection<T>;
}
