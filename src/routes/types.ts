import express, { Request, Response, Router } from 'express'

import stationTradingController from 'src/controllers/StationTradingController'
import { Database } from 'src/databases/Database';
import Type from 'src/models/Type'

export default function typeRoutes(database: Database): Router {

  const router = express.Router()

  router.get('/', async (req: Request, res: Response) => {
    const types: Type[] = await stationTradingController.getAllTypes();
    return res.json(types);
  })

  return router;

}
