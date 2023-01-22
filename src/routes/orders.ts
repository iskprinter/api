import express, { Router } from 'express'
import Joi from 'joi';

import { StationTradingController } from 'src/controllers'
import { AuthService, Validator } from 'src/services';

export default function orderRoutes(stationTradingController: StationTradingController): Router {
  const authService = new AuthService();
  const router = express.Router();
  const validator = new Validator();
  router.get(
    '/',
    authService.validateAuth(),
    validator.validate({
      query: Joi.object({
        'order-type': Joi.allow('all', 'buy', 'sell').required(),
        'region-id': Joi.number().required(),
        'structure-id': Joi.number(),
      })
    }),
    stationTradingController.getOrders(),
    stationTradingController.updateOrders(),
  );
  return router;
}
