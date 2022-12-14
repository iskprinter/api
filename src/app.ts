import axios from 'axios';
import cors from 'cors';
import env from 'env-var';
import express, { Request, Response, NextFunction } from 'express';
import expressPinoLogger from 'express-pino-logger';

import startServer from 'src/bin/startServer';
import { MongoDatabase } from 'src/databases';
import indexRoutes from 'src/routes/index';
import { HttpError } from 'src/errors';
import log from 'src/tools/Logger';
import { Group, Token, Type } from 'src/models';
import { TokenService } from 'src/services';
import { AuthenticationController, HealthcheckController, StationTradingController } from './controllers';
import EsiService from './services/EsiService';
import EsiRequest from './models/EsiRequest';

async function main(): Promise<void> {

  const database = new MongoDatabase()
  await database.connect();

  const app = express()

  // Enable CORS
  app.use(cors({ origin: env.get('FRONTEND_URLS').required().asString().split(",") }));

  // Enable pino logging
  app.use(expressPinoLogger());

  // Enable body parsing
  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  // Load Collections
  const esiRequestCollection = database.getCollection<EsiRequest>('esi-requests');
  const groupsCollection = database.getCollection<Group>('groups');
  const typesCollection = database.getCollection<Type>('types');
  const tokensCollection = database.getCollection<Token>('tokens');

  // Load Services
  const tokenService = new TokenService();
  const esiRequestService = new EsiService(esiRequestCollection);

  // Load Controllers
  const authenticationController = new AuthenticationController(tokensCollection, tokenService);
  const healthcheckController = new HealthcheckController();
  const stationTradingController = new StationTradingController(
    esiRequestService,
    esiRequestCollection,
    groupsCollection,
    typesCollection
  );

  // Load the application routes
  app.use('/', indexRoutes(
    authenticationController,
    healthcheckController,
    stationTradingController,
  ));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use(async (err: any, req: Request, res: Response, next: NextFunction): Promise<void> => {
    log.info(req);

    if (!err) {
      log.info(res);
      return next();
    }

    if (err instanceof HttpError) {
      log.info(`${err.statusCode}: ${err.message}`);
      res.status(err.statusCode).json(err.message);
      log.info(res);
      return;
    }

    log.error('Non-http error received. Returning 500.')
    res.sendStatus(500);
    log.info(res);
    log.error(err);
    return;
  });

  axios.interceptors.request.use((req) => {
    log.info(req);
    return req;
  })

  axios.interceptors.response.use((res) => {
    log.info(res);
    return res;
  })

  startServer(app);

}

// TODO Google the correct pattern here
if (require.main === module) {
  main().catch((err) => {
    log.error(err);
    process.exit(1);
  })
}
