import express, { Router } from 'express'
import Joi from 'joi';

import { StationTradingController } from 'src/controllers'
import { AuthService, Validator } from 'src/services';

export default function structureRoutes(stationTradingController: StationTradingController): Router {
  const authService = new AuthService();
  const validator = new Validator();
  const router = express.Router()
  router.get(
    '/',
    authService.validateAuth(),
    validator.validate({
      query: Joi.object({
        'constellation-id': Joi.number(),
        'region-id': Joi.number(),
        'system-id': Joi.number(),
      })
        .oxor('constellation-id, region-id', 'system-id')
    }),
    stationTradingController.getStructures(),
    stationTradingController.updateStructures(),
  );
  return router;
}
