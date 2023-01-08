import express, { Router } from 'express'
import Joi from 'joi';

import { StationTradingController } from 'src/controllers'
import { Validator } from 'src/services';

export default function stationRoutes(stationTradingController: StationTradingController): Router {
  const validator = new Validator();
  const router = express.Router()
  router.get('/', validator.validate({
    query: Joi.object({
      constellationId: Joi.number(),
      regionId: Joi.number(),
      systemId: Joi.number(),
    })
      .oxor('constellationId, regionId', 'systemId')
  }), stationTradingController.getStations());
  return router;
}
