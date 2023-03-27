import { Application } from 'express';
import { AuthController, ProfileController, StationTradingController } from 'src/controllers';
import v0 from './v0';

export default function (
  app: Application,
  authController: AuthController,
  profileController: ProfileController,
  stationTradingController: StationTradingController,
) {
  v0(app, authController, profileController, stationTradingController);
}
