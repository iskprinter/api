import cors from 'cors'
import express, { NextFunction, Request, Response } from 'express'
import logger from 'morgan'

import indexRoutes from 'src/routes/index'

const app = express()

app.use(logger('dev'))
app.use(express.json())
app.use(express.urlencoded({ extended: false }))
app.use(cors({ origin: '*' }))
app.use((req: Request, res: Response, next: NextFunction) => {
  res.header('Access-Control-Allow-Headers', 'Content-Type')
  next()
})

app.use('/', indexRoutes)

export default app
