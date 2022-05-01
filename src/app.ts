import cors from 'cors'
import express, { Request, Response, NextFunction } from 'express'
import morganLogger from 'morgan'
import loggerFactory from 'pino'

import indexRoutes from 'src/routes/index'
import { UnauthorizedError } from './errors'
import { HttpError } from './errors/HttpError'

const app = express()
const log = loggerFactory()

app.use(cors({ origin: process.env.FRONTEND_URLS?.split(",") }))
app.use(morganLogger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use('/', indexRoutes)

app.use(async (err: any, req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!err) {
    return next()
  }

  if (res.headersSent) {
    log.error('Got an error, but the respones headers were already sent. Returning...')
    log.error(err)
    return next(err)
  }

  if (err instanceof HttpError) {
    log.info('HttpError received. Sending appropriate response.')
    res.status(err.statusCode).send(err.message)
    return
  }

  log.error('Non-http error received. Returning 500.')
  log.error(err)
  res.sendStatus(500)
})

export default app
