import { Application } from 'express'

import { AuthController, ProfileController, StationTradingController } from 'src/controllers'

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
    stationTradingController.updateCharacters(),
  );
  app.get(
    '/v0/characters/:characterId/portrait',
    authController.validateAuth(),
    profileController.getCharacterPortrait(),
  );
}
