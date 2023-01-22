import env from 'env-var';
import { Db, MongoClient } from 'mongodb';

import Collection from './Collection';
import Database from "./Database";
import log from 'src/tools/Logger';
import MongoCollection from './MongoCollection';

export default class MongoDatabase implements Database {
  static DB_NAME = 'iskprinter';
  db: Db | undefined;

  async connect(): Promise<Database> {
    const dbUrl = env.get('DB_URL').required().asUrlString();
    const dbClient = new MongoClient(dbUrl)
    log.info(`Connecting to MongoDB at URL ${dbUrl}...`);
    await dbClient.connect();
    this.db = await dbClient.db(MongoDatabase.DB_NAME)
    return this;
  }

  getCollection<T extends object>(collectionName: string): Collection<T> {
    if (this.db === undefined) {
      throw new Error('The database has not yet been connected.');
    }
    return new MongoCollection<T>(this.db.collection(collectionName));
  }
}
