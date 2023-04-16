import { Application } from 'express'
import Joi from 'joi';

import {
  AuthController,
  ProfileController,
  StationTradingController,
  ValidationController
} from 'src/controllers'

export default function (
  app: Application,
  authController: AuthController,
  profileController: ProfileController,
  stationTradingController: StationTradingController,
  validationController: ValidationController,
) {
  app.get(
    '/v0/characters',
    authController.validateAuth(),
    stationTradingController.getCharacters(),
  );
  app.get(
    '/v0/characters/:characterId/orders',
    validationController.validate({
      params: Joi.object({
        characterId: Joi.number().required(),
      }),
    }),
    authController.validateAuth(),
    stationTradingController.getCharactersOrders(),
  );
  app.get(
    '/v0/characters/:characterId/portrait',
    validationController.validate({
      params: Joi.object({
        characterId: Joi.number().required(),
      }),
    }),
    profileController.getCharacterPortrait(),
  );
  app.get(
    '/v0/characters/:characterId/trades',
    validationController.validate({
      params: Joi.object({
        characterId: Joi.number().required(),
      }),
    }),
    authController.validateAuth(),
    stationTradingController.getCharactersTrades(),
  );
}
