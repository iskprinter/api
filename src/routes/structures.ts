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
        constellationId: Joi.number(),
        regionId: Joi.number(),
        systemId: Joi.number(),
      })
        .oxor('constellationId, regionId', 'systemId')
    }),
    stationTradingController.getStructures()
  );
  return router;
}
