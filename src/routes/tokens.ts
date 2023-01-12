import express, { Router } from 'express'

import { AuthController } from 'src/controllers'
import { Validator } from 'src/services';
import Joi from 'joi';

export default function tokenRoutes(authController: AuthController): Router {

  const router = express.Router()
  const validator = new Validator();

  router.get('/', authController.verifyToken());

  router.post('/',
    validator.validate({
      body: Joi.object({
        proofType: Joi.string().required(),
        proof: Joi.string().required(),
      })
    }),
    authController.getToken()
  )

  return router;

}
