import { Application } from 'express';
import { AuthController, StationTradingController, ValidationController } from 'src/controllers';
import v0 from './v0';

export default function (
  app: Application,
  authController: AuthController,
  stationTradingController: StationTradingController,
  validationController: ValidationController,
) {
  v0(app, authController, stationTradingController, validationController);
}
