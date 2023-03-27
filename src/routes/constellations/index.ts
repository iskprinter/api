import { Application } from 'express';
import { StationTradingController } from 'src/controllers';
import v0 from './v0';

export default function (
  app: Application,
  stationTradingController: StationTradingController,
) {
  v0(app, stationTradingController);
}
