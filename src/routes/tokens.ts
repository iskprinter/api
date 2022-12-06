import express, { NextFunction, Request, Response, Router } from 'express'

import { RequestValidator } from 'src/tools/RequestValidator'
import { AuthenticationController } from 'src/controllers'
import log from 'src/tools/Logger';

export default function tokenRoutes(authenticationController: AuthenticationController): Router {

  const router = express.Router()

  router.get('/', authenticationController.verifyToken());

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
    authenticationController.getToken()
  )

  return router;

}
