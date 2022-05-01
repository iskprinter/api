import express, { Request, Response, NextFunction } from 'express'

import { RequiredParams, RequestValidator } from 'src/tools/RequestValidator'
import { AuthenticationController } from 'src/controllers/Authentication'
import { Token } from 'src/entities/Token'
import { TokenPostRequest, TokenVerificationResponse } from 'src/entities/TokenRequests'
import { BadRequestError } from 'src/errors/BadRequestError'

const router = express.Router()

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  if (!req.headers.authorization && !req.headers.Authorization) {
    throw new BadRequestError('Header \'authorization\' or \'Authorization\' is required.')
  }
  const authHeader = (req.headers.authorization || req.headers.Authorization) as string
  if (authHeader === null) {
    throw new BadRequestError('Header \'authorization\' or \'Authorization\' is required.')
  }
  const accessToken: string = (authHeader as any).match(/^Bearer (.*)$/)[1]

  const tvr: TokenVerificationResponse = await (new AuthenticationController()).verifyToken(accessToken)
  return res.json(tvr)
})

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  const requiredParams: RequiredParams = {
    body: [
      'proofType',
      'proof'
    ],
    query: []
  };
  console.log('Validating request to POST /tokens...');
  (new RequestValidator(requiredParams)).validate(req);
  console.log('Successfully validated request to POST /tokens.');

  const tokenRequest: TokenPostRequest = req.body
  console.log(`Creating token for tokenRequest ${JSON.stringify(tokenRequest)}...`);
  const token: Token = await (new AuthenticationController()).getToken(tokenRequest)
  console.log(`Successfully created token for tokenRequest ${JSON.stringify(tokenRequest)}...`);
  return res.json(token.accessToken)
})

export default router
