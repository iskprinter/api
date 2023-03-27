import cors from 'cors';
import env from 'env-var';
import express, { Request, Response, NextFunction } from 'express';
import expressPinoLogger from 'express-pino-logger';

import startServer from 'src/bin/startServer';
import { MongoDatabase } from 'src/databases';
import loadIndexRoutes from 'src/routes/index';
import { HttpError } from 'src/errors';
import log from 'src/tools/Logger';
import {
  CharacterData,
  ConstellationData,
  EsiRequestData,
  GroupData,
  OrderData,
  RegionData,
  StationData,
  SystemData,
  TokenData,
  TypeData
} from 'src/models';
import { AuthService, DataProxy as DataProxy, EsiService } from 'src/services';
import { AuthController, HealthcheckController, ProfileController, StationTradingController } from './controllers';
import StructureData from './models/StructureData';
import ValidationController from './controllers/ValidationController';

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
  const charactersCollection = database.getCollection<CharacterData>('characters');
  const constellationsCollection = database.getCollection<ConstellationData>('constellations');
  const esiRequestCollection = database.getCollection<EsiRequestData>('esiRequests');
  const groupsCollection = database.getCollection<GroupData>('groups');
  const ordersCollection = database.getCollection<OrderData>('orders');
  const regionsCollection = database.getCollection<RegionData>('regions');
  const stationsCollection = database.getCollection<StationData>('stations');
  const structuresCollection = database.getCollection<StructureData>('structures');
  const systemsCollection = database.getCollection<SystemData>('systems');
  const typesCollection = database.getCollection<TypeData>('types');
  const tokensCollection = database.getCollection<TokenData>('tokens');

  // Create indexes, if necessary
  await Promise.all([
    charactersCollection.createIndex({ character_id: 1 }),
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
  const authService = new AuthService(tokensCollection);
  const esiService = new EsiService(esiRequestCollection);
  const dataProxy = new DataProxy(
    esiService,
    charactersCollection,
    constellationsCollection,
    groupsCollection,
    ordersCollection,
    regionsCollection,
    stationsCollection,
    structuresCollection,
    systemsCollection,
    typesCollection,
  );

  // Load Controllers
  const authController = new AuthController(authService, tokensCollection);
  const healthcheckController = new HealthcheckController();
  const profileController = new ProfileController(authService, esiService);
  const validationController = new ValidationController();
  const stationTradingController = new StationTradingController(
    authService,
    dataProxy
  );

  app.use((req: Request, res: Response, next: NextFunction) => {
    log.info(req);
    return next();
  });

  // Load the application routes
  loadIndexRoutes(
    app,
    authController,
    healthcheckController,
    profileController,
    validationController,
    stationTradingController,
  );

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
