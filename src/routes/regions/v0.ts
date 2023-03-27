import express, { Application, Router } from 'express'
import Joi from 'joi';

import { StationTradingController, ValidationController } from 'src/controllers'

export default function (
  app: Application,
  stationTradingController: StationTradingController,
  validationController: ValidationController,
): Router {
  const router = express.Router()
  app.get(
    '/v0/regions',
    validationController.validate({
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
