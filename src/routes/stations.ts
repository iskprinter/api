import express, { Router } from 'express'
import Joi from 'joi';

import { StationTradingController } from 'src/controllers'
import { Validator } from 'src/services';

export default function stationRoutes(stationTradingController: StationTradingController): Router {
  const validator = new Validator();
  const router = express.Router()
  router.get(
    '/',
    validator.validate({
      query: Joi.object({
        'constellation-id': Joi.number(),
        'region-id': Joi.number(),
        'system-id': Joi.number(),
      })
        .oxor('constellatoin-id, region-id', 'system-id')
    }),
    stationTradingController.getStations(),
    stationTradingController.updateStations()
  );
  router.get(
    '/:stationId',
    validator.validate({
      params: Joi.object({
        stationId: Joi.number().required(),
      }),
    }),
    stationTradingController.getStation(),
    stationTradingController.updateStations()
  );
  return router;
}
