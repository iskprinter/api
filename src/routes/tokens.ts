import express, { Request, Response, NextFunction } from 'express'

import { RequiredParams, RequestValidator } from 'src/tools/RequestValidator'
import { HttpError } from 'src/errors/HttpError'
import { AuthenticationController } from 'src/controllers/Authentication'
import { Token } from 'src/entities/Token'
import { TokenRequest } from 'src/entities/TokenRequest'

const router = express.Router()

router.post('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const requiredParams: RequiredParams = {
      body: [
        'proofType',
        'proof'
      ],
      query: []
    };
    (new RequestValidator(requiredParams)).validate(req)

    const tokenRequest: TokenRequest = req.body
    const token: Token = await (new AuthenticationController()).getToken(tokenRequest)
    return res.json(token.accessToken)
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).send(error.message)
    }
    console.error(error)
    return res.sendStatus(500)
  }
})

export default router
