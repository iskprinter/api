import { Request, RequestHandler, Response } from 'express'

import { Database } from 'src/databases/Database';
import Type from 'src/models/Type';

class StationTradingController {
  database: Database;

  constructor(database: Database) {
    this.database = database;
  }

  getTypes(query: object): RequestHandler {
    return async (req: Request, res: Response) => {
      const types = await this.database.find<Type>(Type.COLLECTION_NAME, query);
      return res.json(types);
    }
  }
}

export default StationTradingController;
