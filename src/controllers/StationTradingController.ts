import { Request, RequestHandler, Response } from 'express'

import { Collection } from 'src/databases';
import { Type } from 'src/models';

class StationTradingController {
  typesCollection: Collection<Type>;

  constructor(typesCollection: Collection<Type>) {
    this.typesCollection = typesCollection;
  }

  getAllTypes(): RequestHandler {
    return async (req: Request, res: Response) => {
      const types = this.typesCollection.find({});
      return res.json(types);
    }
  }
}

export default StationTradingController;
