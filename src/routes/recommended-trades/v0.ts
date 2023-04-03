import { Application } from 'express'
import Joi from 'joi';

import { AuthController, StationTradingController, ValidationController } from 'src/controllers'

export default function (
  app: Application,
  authController: AuthController,
  stationTradingController: StationTradingController,
  validationController: ValidationController,
) {
  app.get(
    '/v0/recommended-trades',
    authController.validateAuth(),
    validationController.validate({
      query: Joi.object({
        'station-id': Joi.number(),
        'structure-id': Joi.number(),
      })
        .xor('station-id', 'structure-id')
    }),
    stationTradingController.getRecommendedTrades(),
    // stationTradingController.updateRecommendedTrades(),
  );
}
