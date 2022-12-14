import express, { Router } from 'express'

import { StationTradingController } from 'src/controllers'

export default function groupRoutes(stationTradingController: StationTradingController): Router {
  const router = express.Router()
  router.get('/', stationTradingController.getMarketGroups());
  router.get('/:marketGroupId', stationTradingController.getMarketGroup());
  return router;
}
