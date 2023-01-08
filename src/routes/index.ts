import express, { Router } from 'express';

import {
  AuthenticationController,
  HealthcheckController,
  StationTradingController,
} from 'src/controllers';
import dealRoutes from 'src/routes/deals';
import regionRoutes from 'src/routes/regions';
import systemRoutes from 'src/routes/systems';
import tokenRoutes from 'src/routes/tokens';

export default function indexRoutes(
  authenticationController: AuthenticationController,
  healthcheckController: HealthcheckController,
  stationTradingController: StationTradingController,
): Router {

  const router = express.Router();
  router.use('/deals', dealRoutes(stationTradingController));
  router.use('/regions', regionRoutes(stationTradingController));
  router.use('/systems', systemRoutes(stationTradingController));
  router.use('/tokens', tokenRoutes(authenticationController));

  router.get('/', healthcheckController.announceHealth());

  return router;
}
