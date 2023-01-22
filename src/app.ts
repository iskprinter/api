import cors from 'cors';
import env from 'env-var';
import express, { Request, Response, NextFunction } from 'express';
import expressPinoLogger from 'express-pino-logger';

import startServer from 'src/bin/startServer';
import { MongoDatabase } from 'src/databases';
import indexRoutes from 'src/routes/index';
import { HttpError } from 'src/errors';
import log from 'src/tools/Logger';
import { Constellation, EsiRequest, Group, Order, Region, Station, Structure, System, Token, Type } from 'src/models';
import { AuthService, DataProxy as DataProxy } from 'src/services';
import { AuthController, HealthcheckController, StationTradingController } from './controllers';
import EsiService from './services/EsiService';

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
  const constellationsCollection = database.getCollection(Constellation, 'constellations');
  const esiRequestCollection = database.getCollection(EsiRequest, 'esiRequests');
  const groupsCollection = database.getCollection(Group, 'groups');
  const ordersCollection = database.getCollection(Order, 'orders');
  const regionsCollection = database.getCollection(Region, 'regions');
  const stationsCollection = database.getCollection(Station, 'stations');
  const structuresCollection = database.getCollection(Structure, 'structures');
  const systemsCollection = database.getCollection(System, 'systems');
  const typesCollection = database.getCollection(Type, 'types');
  const tokensCollection = database.getCollection(Token, 'tokens');

  // Create indexes, if necessary
  await Promise.all([
    constellationsCollection.createIndex({ constellation_id: 1 }),
    esiRequestCollection.createIndex({ requestId: 1 }),
    groupsCollection.createIndex({ market_group_id: 1 }),
    ordersCollection.createIndex({ order_id: 1 }),
    regionsCollection.createIndex({ region_id: 1 }),
    stationsCollection.createIndex({ station_id: 1 }),
    structuresCollection.createIndex({ structure_id: 1 }),
    systemsCollection.createIndex({ system_id: 1 }),
    typesCollection.createIndex({ type_id: 1 }),
    tokensCollection.createIndex({ accessToken: 1 }),
  ])

  // Load Services
  const authService = new AuthService();
  const esiService = new EsiService(esiRequestCollection);
  const dataProxy = new DataProxy(
    esiService,
    constellationsCollection,
    groupsCollection,
    ordersCollection,
    regionsCollection,
    stationsCollection,
    structuresCollection,
    systemsCollection,
    typesCollection,
  )

  // Load Controllers
  const authController = new AuthController(tokensCollection, authService);
  const healthcheckController = new HealthcheckController();
  const stationTradingController = new StationTradingController(
    authService,
    dataProxy
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    log.info(req);
    return next();
  });

  // Load the application routes
  app.use('/', indexRoutes(
    authController,
    healthcheckController,
    stationTradingController,
  ));

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
    if (!err) {
      log.info(res);
      return next();
    }

    if (err instanceof HttpError) {
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
