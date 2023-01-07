import express, { Router } from 'express'
import Joi from 'joi';

import { StationTradingController } from 'src/controllers'
import { Validator } from 'src/services'

export default function typeRoutes(stationTradingController: StationTradingController): Router {
  const router = express.Router()
  const validator = new Validator();
  router.get('/', validator.validate({
    headers: Joi.object({
      authorization: Joi.string().regex(/^Bearer [\w.-]+$/).required()
    }),
    query: Joi.object({
      characterId: Joi.number().required(),
      stationId: Joi.number(),
      structureId: Joi.number(),
    })
      .xor('stationId', 'structureId')
  }), stationTradingController.getDeals());
  return router;
}
