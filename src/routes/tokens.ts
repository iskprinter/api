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
  (new RequestValidator(requiredParams)).validate(req)

  const tokenRequest: TokenPostRequest = req.body
  const token: Token = await (new AuthenticationController()).getToken(tokenRequest)
  return res.json(token.accessToken)
})

export default router