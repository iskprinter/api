import { MongoClient, Collection } from 'mongodb'

import { PersistentEntity } from 'src/entities/PersistentEntity'

export class Token implements PersistentEntity {
  static DB_NAME = 'iskprinter';
  static COLLECTION_NAME = 'tokens';

  accessToken: string;
  refreshToken: string;

  constructor(accessToken: string, refreshToken: string) {
    this.accessToken = accessToken
    this.refreshToken = refreshToken
  }

  static async withCollection(next: (collection: Collection<any>) => Promise<any>): Promise<any> {
    const dbUrl = process.env.DB_URL;
    if (!dbUrl) {
      throw new Error("Environment variable 'DB_URL' is undefined.")
    }
    const client = new MongoClient(dbUrl)
    console.log(`Connecting to MongoDB at URL ${dbUrl}...`);
    await client.connect()
    const db = await client.db(Token.DB_NAME)
    const collection = await db.collection(Token.COLLECTION_NAME)

    const updatedEntity = await next(collection);

    await client.close();

    return updatedEntity;
  }

  async save(): Promise<Token> {
    await Token.withCollection((collection: Collection<any>) => collection.insertOne(this))
    console.log(`Successfully saved token to database ${Token.DB_NAME}.`)
    return this;
  }
}
