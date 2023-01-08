import express, { Router } from 'express';

import {
  AuthenticationController,
  HealthcheckController,
  StationTradingController,
} from 'src/controllers';
import constellationRoutes from 'src/routes/constellations';
import dealRoutes from 'src/routes/deals';
import regionRoutes from 'src/routes/regions';
import stationRoutes from 'src/routes/stations';
import structureRoutes from 'src/routes/structures';
import systemRoutes from 'src/routes/systems';
import tokenRoutes from 'src/routes/tokens';

export default function indexRoutes(
  authenticationController: AuthenticationController,
  healthcheckController: HealthcheckController,
  stationTradingController: StationTradingController,
): Router {

  const router = express.Router();
  router.use('/constellations', constellationRoutes(stationTradingController));
  router.use('/deals', dealRoutes(stationTradingController));
  router.use('/regions', regionRoutes(stationTradingController));
  router.use('/stations', stationRoutes(stationTradingController));
  router.use('/structures', structureRoutes(stationTradingController));
  router.use('/systems', systemRoutes(stationTradingController));
  router.use('/tokens', tokenRoutes(authenticationController));

  router.get('/', healthcheckController.announceHealth());

  return router;
}
