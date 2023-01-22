import Collection from './Collection';

export default interface Database {
  connect(): Promise<Database>;
  getCollection<T extends object>(collectionName: string): Collection<T>;
}
