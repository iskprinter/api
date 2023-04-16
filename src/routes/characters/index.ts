import { Application } from 'express';
import {
  AuthController,
  ProfileController,
  StationTradingController,
  ValidationController,
} from 'src/controllers';
import v0 from './v0';

export default function (
  app: Application,
  authController: AuthController,
  profileController: ProfileController,
  stationTradingController: StationTradingController,
  validationController: ValidationController,
) {
  v0(app, authController, profileController, stationTradingController, validationController);
}
