import { Application } from 'express'

import {
  AuthController,
  ProfileController,
  StationTradingController
} from 'src/controllers'

export default function (
  app: Application,
  authController: AuthController,
  profileController: ProfileController,
  stationTradingController: StationTradingController,
) {
  app.get(
    '/v0/characters',
    authController.validateAuth(),
    stationTradingController.getCharacters(),
  );
  app.get(
    '/v0/characters/:characterId/orders',
    authController.validateAuth(),
    stationTradingController.getCharactersOrders(),
  );
  app.get(
    '/v0/characters/:characterId/portrait',
    // authController.validateAuth(),
    profileController.getCharacterPortrait(),
  );
  app.get(
    '/v0/characters/:characterId/trades',
    authController.validateAuth(),
    stationTradingController.getCharactersTrades(),
  );
}
