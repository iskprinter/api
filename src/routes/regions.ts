import express, { Router } from 'express'

import { StationTradingController } from 'src/controllers'

export default function regionRoutes(stationTradingController: StationTradingController): Router {
  const router = express.Router()
  router.get('/', stationTradingController.getRegions());
  return router;
}
