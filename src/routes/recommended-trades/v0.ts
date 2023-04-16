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
    stationTradingController.getRecommendedTrades(),
  );
  app.get(
    '/v0/recommended-trades/:recommendedTradeId',
    validationController.validate({
      params: Joi.object({
        recommendedTradeId: Joi.string().required(),
      }),
    }),
    authController.validateAuth(),
    stationTradingController.getRecommendedTrade(),
  );
  app.post(
    '/v0/recommended-trades',
    validationController.validate({
      body: Joi.object({
        stationId: Joi.number(),
        structureId: Joi.number(),
      })
        .xor('stationId', 'structureId')
    }),
    authController.validateAuth(),
    stationTradingController.createRecommendedTrade(),
  );
}
