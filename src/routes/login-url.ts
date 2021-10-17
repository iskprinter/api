import express, { Request, Response, NextFunction } from 'express'

import { RequiredParams, RequestValidator } from 'src/tools/RequestValidator'
import { HttpError } from 'src/errors/HttpError'

const router = express.Router()

const LOGIN_SERVER_DOMAIN_NAME = 'login.eveonline.com'

router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  const requiredParams: RequiredParams = {
    body: [],
    query: ['callback-url']
  }

  try {
    (new RequestValidator(requiredParams)).validate(req)

    const responseType = 'code'
    const scopes = [
      'esi-assets.read_assets.v1',
      'esi-characterstats.read.v1',
      'esi-clones.read_clones.v1',
      'esi-location.read_location.v1',
      'esi-markets.read_character_orders.v1',
      'esi-markets.structure_markets.v1',
      'esi-skills.read_skills.v1',
      'esi-universe.read_structures.v1',
      'esi-wallet.read_character_wallet.v1'
    ]
    const loginUrl = [
      `https://${LOGIN_SERVER_DOMAIN_NAME}/oauth/authorize`,
      `?response_type=${responseType}`,
      `&redirect_uri=${req.query['callback-url']}`,
      `&client_id=${process.env.CLIENT_ID}`,
      `&scope=${scopes.join('%20')}`,
      req.body.state ? `&state=${req.body.state}` : ''
    ].join('')
    res.json(loginUrl)
  } catch (error) {
    if (error instanceof HttpError) {
      return res.status(error.statusCode).send(error.message)
    }
    console.error(error)
    return res.sendStatus(500)
  }
})

export default router
