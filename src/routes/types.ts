import express, { Router } from 'express'

import StationTradingController from 'src/controllers/StationTradingController'
import { Database } from 'src/databases/Database';

export default function typeRoutes(database: Database): Router {

  const router = express.Router()
  const stationTradingController = new StationTradingController(database);

  router.get('/', stationTradingController.getTypes({}));

  return router;

}
