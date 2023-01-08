import cors from 'cors';
import env from 'env-var';
import express, { Request, Response, NextFunction } from 'express';
import expressPinoLogger from 'express-pino-logger';

import startServer from 'src/bin/startServer';
import { MongoDatabase } from 'src/databases';
import indexRoutes from 'src/routes/index';
import { HttpError } from 'src/errors';
import log from 'src/tools/Logger';
import { Group, Region, System, Token, Type } from 'src/models';
import { DataProxy, TokenService } from 'src/services';
import { AuthenticationController, HealthcheckController, StationTradingController } from './controllers';
import EsiService from './services/EsiService';
import EsiRequest from './models/EsiRequest';
import Constellation from './models/Constellation';
import { Station } from './models/Station';
import { Structure } from './models/Structure';

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
  const constellationsCollection = database.getCollection<Constellation>('constellations');
  const esiRequestCollection = database.getCollection<EsiRequest>('esi-requests');
  const groupsCollection = database.getCollection<Group>('groups');
  const regionsCollection = database.getCollection<Region>('regions');
  const stationsCollection = database.getCollection<Station>('stations');
  const structuresCollection = database.getCollection<Structure>('structures');
  const systemsCollection = database.getCollection<System>('systems');
  const typesCollection = database.getCollection<Type>('types');
  const tokensCollection = database.getCollection<Token>('tokens');

  // Create indexes, if necessary
  await Promise.all([
    constellationsCollection.createIndex({ constellation_id: 1 }),
    esiRequestCollection.createIndex({ path: 1 }),
    groupsCollection.createIndex({ market_group_id: 1 }),
    regionsCollection.createIndex({ region_id: 1 }),
    stationsCollection.createIndex({ station_id: 1 }),
    structuresCollection.createIndex({ structure_id: 1 }),
    systemsCollection.createIndex({ system_id: 1 }),
    typesCollection.createIndex({ type_id: 1 }),
    tokensCollection.createIndex({ accessToken: 1 }),
  ])

  // Load Services
  const tokenService = new TokenService();
  const esiRequestService = new EsiService(esiRequestCollection);
  const dataProxy = new DataProxy(
    constellationsCollection,
    esiRequestService,
    groupsCollection,
    regionsCollection,
    stationsCollection,
    structuresCollection,
    systemsCollection,
    typesCollection,
  );

  // Load Controllers
  const authenticationController = new AuthenticationController(tokensCollection, tokenService);
  const healthcheckController = new HealthcheckController();
  const stationTradingController = new StationTradingController(dataProxy);

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

  startServer(app);

}

// TODO Google the correct pattern here
if (require.main === module) {
  main().catch((err) => {
    log.error(err);
    process.exit(1);
  })
}
