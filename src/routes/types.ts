import express, { Router } from 'express'

import { StationTradingController } from 'src/controllers'

export default function typeRoutes(stationTradingController: StationTradingController): Router {
  const router = express.Router()
  router.get('/', stationTradingController.getTypes());
  return router;
}
