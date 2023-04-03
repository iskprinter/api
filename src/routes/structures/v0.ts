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
    '/v0/structures',
    authController.validateAuth(),
    validationController.validate({
      query: Joi.object({
        // 'constellation-id': Joi.number(),
        // 'region-id': Joi.number(),
        'system-id': Joi.number().required(),
      })
        // .oxor('constellation-id, region-id', 'system-id')
    }),
    stationTradingController.getStructures(),
    // stationTradingController.updateStructures(),
  );
  app.get(
    '/v0/structures/:structureId',
    authController.validateAuth(),
    validationController.validate({
      params: Joi.object({
        'structureId': Joi.number().required(),
      }),
    }),
    stationTradingController.getStructure(),
    // stationTradingController.updateStructures(),
  );
}
