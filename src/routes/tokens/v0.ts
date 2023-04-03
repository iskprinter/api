import { Application } from 'express'
import Joi from 'joi';

import { AuthController } from 'src/controllers'
import { ValidationController } from 'src/services';

export default function (
  app: Application,
  authController: AuthController
) {
  const validator = new ValidationController();
  app.delete(
    '/v0/tokens',
    validator.validate({
      headers: Joi.object({
        authorization: Joi.string().required(),
      })
    }),
    authController.deleteTokens()
  );
  app.post(
    '/v0/tokens',
    validator.validate({
      body: Joi.object({
        proofType: Joi.string().required(),
        proof: Joi.string().required(),
      })
    }),
    authController.createTokens()
  );
}
