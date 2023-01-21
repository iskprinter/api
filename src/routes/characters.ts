import express, { Router } from 'express'

import { StationTradingController } from 'src/controllers'
import { AuthService } from 'src/services';

export default function constellationRoutes(stationTradingController: StationTradingController): Router {
  const authService = new AuthService();
  const router = express.Router()
  router.get(
    '/',
    authService.validateAuth(),
    stationTradingController.getCharacters(),
    stationTradingController.updateCharacters(),
  );
  return router;
}
