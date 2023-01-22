import express, { Router } from 'express'
import Joi from 'joi';

import { StationTradingController } from 'src/controllers'
import { AuthService, Validator } from 'src/services'

export default function dealRoutes(stationTradingController: StationTradingController): Router {
  const router = express.Router()
  const validator = new Validator();
  const authService = new AuthService();
  router.get(
    '/',
    authService.validateAuth(),
    validator.validate({
      query: Joi.object({
        'station-id': Joi.number(),
        'structure-id': Joi.number(),
      })
        .xor('station-id', 'structure-id')
    }),
    stationTradingController.getDeals(),
    stationTradingController.updateDeals(),
  );
  return router;
}
