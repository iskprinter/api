import express, { Router } from 'express'
import Joi from 'joi';

import { StationTradingController } from 'src/controllers'
import { Validator } from 'src/services';

export default function systemRoutes(stationTradingController: StationTradingController): Router {
  const validator = new Validator();
  const router = express.Router()
  router.get(
    '/',
    validator.validate({
      query: Joi.object({
        'constellation-id': Joi.number(),
        'region-id': Joi.number(),
      })
        .oxor('constellation-id', 'region-id')
    }),
    stationTradingController.getSystems(),
    stationTradingController.updateSystems(),
  );
  return router;
}
