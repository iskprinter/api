import Collection from './Collection';

export default interface Database {
  connect(): Promise<Database>;
  getCollection<T>(collectionName: string): Collection<T>;
}
