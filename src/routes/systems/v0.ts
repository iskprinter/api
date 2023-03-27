import { Application } from 'express'
import Joi from 'joi';

import { StationTradingController, ValidationController } from 'src/controllers'

export default function (
  app: Application,
  stationTradingController: StationTradingController,
  validationController: ValidationController,
) {
  app.get(
    '/v0/systems',
    validationController.validate({
      query: Joi.object({
        'constellation-id': Joi.number(),
        'region-id': Joi.number(),
      })
        .oxor('constellation-id', 'region-id')
    }),
    stationTradingController.getSystems(),
    stationTradingController.updateSystems(),
  );
}
