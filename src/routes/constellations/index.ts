import { Application } from 'express';
import { StationTradingController, ValidationController } from 'src/controllers';
import v0 from './v0';

export default function (
  app: Application,
  stationTradingController: StationTradingController,
  validationController: ValidationController,
) {
  v0(app, stationTradingController, validationController);
}
