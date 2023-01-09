import express, { NextFunction, Request, Response, Router } from 'express'

import { RequestValidator } from 'src/tools/RequestValidator'
import { AuthController } from 'src/controllers'
import log from 'src/tools/Logger';

export default function tokenRoutes(authController: AuthController): Router {

  const router = express.Router()

  router.get('/', authController.verifyToken());

  router.post('/',
    async (req: Request, res: Response, next: NextFunction) => {
      log.info('Validating request to POST /tokens...');
      (new RequestValidator({
        body: [
          'proofType',
          'proof'
        ],
        query: []
      })).validate(req);
      log.info('Successfully validated request to POST /tokens.');
      next();
    },
    authController.getToken()
  )

  return router;

}
