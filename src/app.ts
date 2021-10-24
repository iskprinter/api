import express, { Request, Response, NextFunction } from 'express'
import morganLogger from 'morgan'
import loggerFactory from 'pino'

import indexRoutes from 'src/routes/index'
import { HttpError } from './errors/HttpError'

const app = express()
const log = loggerFactory()

app.use(morganLogger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use((err: any, req: Request, res: Response, next: NextFunction): void => {
  if (err) {
    if (err instanceof HttpError) {
      res.status(err.statusCode).send(err.message)
      return
    }
    log.error(err)
    res.sendStatus(500)
    return
  }
  next()
})
app.use('/', indexRoutes)

export default app
