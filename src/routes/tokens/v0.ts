import { Application } from 'express'

import { AuthController } from 'src/controllers'
import { ValidationController } from 'src/services';
import Joi from 'joi';

export default function (
  app: Application,
  authController: AuthController
) {
  const validator = new ValidationController();
  app.post(
    '/v0/tokens',
    validator.validate({
      body: Joi.object({
        proofType: Joi.string().required(),
        proof: Joi.string().required(),
      })
    }),
    authController.getToken()
  )
}
