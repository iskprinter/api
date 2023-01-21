import env from 'env-var';
import { MongoClient, Collection } from 'mongodb'

import PersistentEntity from './PersistentEntity'
import log from 'src/tools/Logger';
import TokenData from './TokenData';


export default class Token implements PersistentEntity, TokenData {
  static DB_NAME = 'iskprinter';
  static COLLECTION_NAME = 'tokens';

  public accessToken: string;
  public refreshToken: string;
  constructor(tokenData: TokenData) {
    this.accessToken = tokenData.accessToken;
    this.refreshToken = tokenData.refreshToken;
  }

  static async withCollection(next: (collection: Collection<any>) => Promise<any>): Promise<any> {
    const dbUrl = env.get('DB_URL').required().asUrlString();

    const client = new MongoClient(dbUrl)
    log.info(`Connecting to MongoDB at URL ${dbUrl}...`);
    await client.connect()

    log.info(`Opening database ${Token.DB_NAME}...`);
    const db = client.db(Token.DB_NAME)

    log.info(`Opening collection ${Token.COLLECTION_NAME}...`);
    const collection = db.collection(Token.COLLECTION_NAME)

    const updatedEntity = await next(collection);

    log.info(`Closing connection to MongoDB at URL${dbUrl}...`);
    await client.close();

    return updatedEntity;
  }

  async save(): Promise<Token> {
    await Token.withCollection((collection: Collection<any>) => collection.insertOne(this))
    log.info(`Successfully saved token to database ${Token.DB_NAME}.`)
    return this;
  }
}
