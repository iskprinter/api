import express, { Router } from 'express';

import { Database } from 'src/databases';
import {
  AuthenticationController,
  HealthcheckController,
  StationTradingController,
} from 'src/controllers'
import tokenRoutes from 'src/routes/tokens';
import typeRoutes from 'src/routes/types';
import {
  Token,
  Type
} from 'src/models';

export default function indexRoutes(database: Database): Router {

  const router = express.Router();

  const typesCollection = database.getCollection<Type>('types');
  const tokensCollection = database.getCollection<Token>('tokens');

  const authenticationController = new AuthenticationController(tokensCollection);
  const healthcheckController = new HealthcheckController();
  const stationTradingController = new StationTradingController(typesCollection);

  router.use('/tokens', tokenRoutes(authenticationController));
  router.use('/types', typeRoutes(stationTradingController));

  router.get('/', healthcheckController.announceHealth());

  return router;
}
