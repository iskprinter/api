import cors from 'cors'
import express, { Request, Response, NextFunction } from 'express'
import expressPinoLogger from 'express-pino-logger';

import indexRoutes from 'src/routes/index'
import { UnauthorizedError } from './errors'
import { HttpError } from './errors/HttpError'

const app = express()

// Enable CORS
app.use(cors({ origin: process.env.FRONTEND_URLS?.split(",") }))

// Enable pino logging
app.use(expressPinoLogger());

// Enable body parsing
app.use(express.json())
app.use(express.urlencoded({ extended: false }))

// Load the application routes
app.use('/', indexRoutes)

app.use(async (err: any, req: Request, res: Response, next: NextFunction): Promise<void> => {
  if (!err) {
    return next()
  }

  if (res.headersSent) {
    console.error('Got an error, but the respones headers were already sent. Returning...')
    console.error(err)
    return next(err)
  }

  if (err instanceof HttpError) {
    console.info('HttpError received. Sending appropriate response.')
    res.status(err.statusCode).json(err.message)
    return
  }

  console.error('Non-http error received. Returning 500.')
  console.error(err)
  res.sendStatus(500)
})

export default app
