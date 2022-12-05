import env from 'env-var';

import { Database } from "src/databases/Database";
import log from 'src/tools/Logger';
import { Db, MongoClient } from 'mongodb';

export class MongoDatabase implements Database {
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

  async find<T>(collectionName: string, query: object): Promise<Array<T>> {
    if (this.db === undefined) {
      throw new Error('The database has not yet been connected.');
    }
    const collection = await this.db.collection(collectionName);
    const results = await collection.find(query).toArray() as Array<T>;
    return results;
  }

}
