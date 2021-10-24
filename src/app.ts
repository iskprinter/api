import express from 'express'
import logger from 'morgan'

import indexRoutes from 'src/routes/index'
import { HttpError } from './errors/HttpError'

const app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(async (req, res, next) => {
  try {
    await next()
  } catch (err) {
    if (err instanceof HttpError) {
      return res.status(err.statusCode).send(err.message)
    }
    console.error(err)
    return res.sendStatus(500)
  }
})
app.use('/', indexRoutes)

export default app
