import express, { Router } from 'express';

import {
  AuthenticationController,
  HealthcheckController,
  StationTradingController,
} from 'src/controllers';
import groupRoutes from 'src/routes/groups';
import tokenRoutes from 'src/routes/tokens';
import typeRoutes from 'src/routes/types';

export default function indexRoutes(
  authenticationController: AuthenticationController,
  healthcheckController: HealthcheckController,
  stationTradingController: StationTradingController,
): Router {

  const router = express.Router();
  router.use('/groups', groupRoutes(stationTradingController));
  router.use('/tokens', tokenRoutes(authenticationController));
  router.use('/types', typeRoutes(stationTradingController));

  router.get('/', healthcheckController.announceHealth());

  return router;
}
