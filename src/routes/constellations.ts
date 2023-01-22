import express, { Router } from 'express'

import { StationTradingController } from 'src/controllers'

export default function constellationRoutes(stationTradingController: StationTradingController): Router {
  const router = express.Router()
  router.get(
    '/',
    stationTradingController.getConstellations(),
    stationTradingController.updateDeals(),
  );
  return router;
}
