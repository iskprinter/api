import express, { Router } from 'express'
import Joi from 'joi';

import { StationTradingController } from 'src/controllers'
import { Validator } from 'src/services';

export default function regionRoutes(stationTradingController: StationTradingController): Router {
  const router = express.Router()
  const validator = new Validator()
  router.get(
    '/',
    validator.validate({
      query: Joi.object({
        'system-id': Joi.number(),
      }),
    }),
    stationTradingController.getRegions(),
    stationTradingController.updateRegions(),
    stationTradingController.updateConstellations(),
  );
  return router;
}
