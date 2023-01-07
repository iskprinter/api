import { NextFunction, Request, RequestHandler, Response } from 'express'
import Joi from 'joi';

export default class Validator {
  validate({ headers, query }: { headers: Joi.ObjectSchema, query: Joi.ObjectSchema }): RequestHandler {
    return (req: Request, res: Response, next: NextFunction) => {
      const requestSchema = Joi.object({ headers, query })
      const requestValidation = requestSchema.validate(req, { allowUnknown: true });
      if (requestValidation.error) {
        return res.status(400).send(String(requestValidation.error));
      }
      next();
    }
  }
}
