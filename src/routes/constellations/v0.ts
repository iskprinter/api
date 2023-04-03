import { Application } from 'express'
import Joi from 'joi';

import { StationTradingController, ValidationController } from 'src/controllers'

export default function (
  app: Application,
  stationTradingController: StationTradingController,
  validationController: ValidationController,
) {
  app.get(
    '/v0/constellations',
    validationController.validate({
        query: Joi.object({
            'region-id': Joi.number(),
        })
    }),
    stationTradingController.getConstellations(),
    // stationTradingController.updateConstellations(),
  );
}
