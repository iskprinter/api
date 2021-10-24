import express from 'express'
import morganLogger from 'morgan'
import loggerFactory from 'pino'

import indexRoutes from 'src/routes/index'
import { HttpError } from './errors/HttpError'

const app = express()
const log = loggerFactory();

app.use(morganLogger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(async (req, res, next) => {
  try {
    await next()
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).send(err.message)
    }
    log.error(err)
    return res.sendStatus(500)
  }
})
app.use('/', indexRoutes)

export default app
