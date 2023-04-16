import { Application } from 'express';

import {
  AuthController,
  HealthcheckController,
  ProfileController,
  StationTradingController,
} from 'src/controllers';
import ValidationController from 'src/controllers/ValidationController';
import loadCharacterRoutes from 'src/routes/characters';
import loadConstellationRoutes from 'src/routes/constellations';
import loadRecommendedTradesRoutes from 'src/routes/recommended-trades';
// import loadOrderRoutes from 'src/routes/orders';
import loadRegionRoutes from 'src/routes/regions';
import loadStationRoutes from 'src/routes/stations';
import loadStructureRoutes from 'src/routes/structures';
import loadSystemRoutes from 'src/routes/systems';
import loadTokenRoutes from 'src/routes/tokens';

export default function (
  app: Application,
  authController: AuthController,
  healthcheckController: HealthcheckController,
  profileController: ProfileController,
  validationController: ValidationController,
  stationTradingController: StationTradingController,
) {
  app.get('/', healthcheckController.announceHealth());

  loadCharacterRoutes(app, authController, profileController, stationTradingController, validationController);
  loadConstellationRoutes(app, stationTradingController, validationController);
  loadRecommendedTradesRoutes(app, authController, stationTradingController, validationController);
  // loadOrderRoutes(app, authController, stationTradingController, validationController);
  loadRegionRoutes(app, stationTradingController, validationController);
  loadStationRoutes(app, stationTradingController, validationController);
  loadStructureRoutes(app, authController, stationTradingController, validationController);
  loadSystemRoutes(app, stationTradingController, validationController);
  loadTokenRoutes(app, authController);
}
