import express, { Request, Response, Router } from 'express'

import { RequiredParams, RequestValidator } from 'src/tools/RequestValidator'
import { AuthenticationController}  from 'src/controllers'
import { Token } from 'src/models'
import { TokenPostRequest, TokenVerificationResponse } from 'src/models/TokenRequests'
import { BadRequestError } from 'src/errors/BadRequestError'
import log from 'src/tools/Logger';

export default function tokenRoutes(authenticationController: AuthenticationController): Router {

  const router = express.Router()

  router.get('/', async (req: Request, res: Response) => {
    if (!req.headers.authorization && !req.headers.Authorization) {
      throw new BadRequestError('Header \'authorization\' or \'Authorization\' is required.')
    }
    const authHeader = (req.headers.authorization || req.headers.Authorization) as string
    if (authHeader === null) {
      throw new BadRequestError('Header \'authorization\' or \'Authorization\' is required.')
    }
    const accessToken: string = (authHeader as any).match(/^Bearer (.*)$/)[1]

    const tvr: TokenVerificationResponse = await authenticationController.verifyToken(accessToken)
    return res.json(tvr)
  })

  router.post('/', async (req: Request, res: Response) => {
    const requiredParams: RequiredParams = {
      body: [
        'proofType',
        'proof'
      ],
      query: []
    };
    log.info('Validating request to POST /tokens...');
    (new RequestValidator(requiredParams)).validate(req);
    log.info('Successfully validated request to POST /tokens.');

    const tokenRequest: TokenPostRequest = req.body

    log.info(`Creating token for tokenRequest ${JSON.stringify(tokenRequest)}...`);
    const token: Token = await authenticationController.getToken(tokenRequest)
    log.info(`Successfully created token for tokenRequest ${JSON.stringify(tokenRequest)}.`);

    return res.json(token.accessToken)
  })

  return router;

}
