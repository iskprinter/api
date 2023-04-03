import { Application } from 'express'
import Joi from 'joi';

import { StationTradingController, ValidationController } from 'src/controllers'

export default function (
  app: Application,
  stationTradingController: StationTradingController,
  validationController: ValidationController,
) {
  app.get(
    '/v0/stations',
    validationController.validate({
      query: Joi.object({
        // 'constellation-id': Joi.number(),
        // 'region-id': Joi.number(),
        'system-id': Joi.number().required(),
      })
        // .oxor('constellation-id, region-id', 'system-id')
    }),
    stationTradingController.getStations(),
    // stationTradingController.updateStations()
  );
  app.get(
    '/v0/stations/:stationId',
    validationController.validate({
      params: Joi.object({
        stationId: Joi.number().required(),
      }),
    }),
    stationTradingController.getStation(),
    // stationTradingController.updateStations()
  );
}
